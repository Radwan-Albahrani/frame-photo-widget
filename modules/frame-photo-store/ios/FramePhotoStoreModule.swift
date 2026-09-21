import CryptoKit
import ExpoModulesCore
import ImageIO
import PhotosUI
import UIKit
import UniformTypeIdentifiers
import WidgetKit

private let appGroup = "group.com.lumen.frame"
private let photosDirectoryName = "photos"

private enum StoreError: Error, LocalizedError {
  case missingContainer
  case unreadableSource(String)
  case encodingFailed
  case noPresenter

  var errorDescription: String? {
    switch self {
    case .missingContainer:
      return "App Group \(appGroup) is not reachable. Check the entitlement on both the app and the widget."
    case .unreadableSource(let uri):
      return "Could not read an image at \(uri)."
    case .encodingFailed:
      return "Could not encode the downsampled image as JPEG."
    case .noPresenter:
      return "No view controller is available to present the photo picker."
    }
  }
}

private func containerURL() throws -> URL {
  guard
    let url = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: appGroup)
  else { throw StoreError.missingContainer }
  return url
}

private func photosDirectory() throws -> URL {
  let directory = try containerURL().appendingPathComponent(photosDirectoryName, isDirectory: true)
  if !FileManager.default.fileExists(atPath: directory.path) {
    try FileManager.default.createDirectory(
      at: directory, withIntermediateDirectories: true, attributes: nil)
  }
  return directory
}

private func sourceURL(from uri: String) -> URL? {
  if uri.hasPrefix("file://") || uri.hasPrefix("ph://") || uri.hasPrefix("assets-library://") {
    return URL(string: uri)
  }
  if uri.hasPrefix("/") { return URL(fileURLWithPath: uri) }
  return URL(string: uri)
}

private func downsample(url: URL, maxPixels: Int) throws -> UIImage {
  let sourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
  guard let source = CGImageSourceCreateWithURL(url as CFURL, sourceOptions) else {
    throw StoreError.unreadableSource(url.absoluteString)
  }
  let thumbnailOptions =
    [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceShouldCacheImmediately: true,
      kCGImageSourceThumbnailMaxPixelSize: maxPixels,
    ] as CFDictionary
  guard let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, thumbnailOptions) else {
    throw StoreError.unreadableSource(url.absoluteString)
  }
  return UIImage(cgImage: thumbnail)
}

private func store(_ image: UIImage, fileName: String, quality: Double) throws -> [String: Any] {
  guard let data = image.jpegData(compressionQuality: CGFloat(quality)) else {
    throw StoreError.encodingFailed
  }
  let destination = try photosDirectory().appendingPathComponent(fileName)
  try data.write(to: destination, options: .atomic)
  let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
  return [
    "fileName": fileName,
    "uri": destination.absoluteString,
    "width": Int(image.size.width * image.scale),
    "height": Int(image.size.height * image.scale),
    "bytes": data.count,
    "contentHash": digest,
  ]
}

// what: PHPicker refuses the abstract public.image, so the request names the concrete type the
// provider registered; the file URL is only valid inside the callback, so it is copied out first
private func copiedFile(from provider: NSItemProvider) async throws -> URL {
  let type =
    provider.registeredTypeIdentifiers.first { UTType($0)?.conforms(to: .image) == true }
    ?? provider.registeredTypeIdentifiers.first
    ?? UTType.image.identifier
  let destination = FileManager.default.temporaryDirectory
    .appendingPathComponent(UUID().uuidString)
    .appendingPathExtension(UTType(type)?.preferredFilenameExtension ?? "img")
  do {
    return try await withCheckedThrowingContinuation { continuation in
      provider.loadFileRepresentation(forTypeIdentifier: type) { url, error in
        guard let url else {
          continuation.resume(throwing: error ?? StoreError.unreadableSource(type))
          return
        }
        do {
          try FileManager.default.copyItem(at: url, to: destination)
          continuation.resume(returning: destination)
        } catch {
          continuation.resume(throwing: error)
        }
      }
    }
  } catch {
    // what: some providers only serve bytes, not a file; the bytes are written out so one decode path remains
    let data: Data = try await withCheckedThrowingContinuation { continuation in
      provider.loadDataRepresentation(forTypeIdentifier: type) { data, dataError in
        if let data { continuation.resume(returning: data) } else {
          continuation.resume(throwing: dataError ?? error)
        }
      }
    }
    try data.write(to: destination, options: .atomic)
    return destination
  }
}

private final class PickerSession: NSObject, PHPickerViewControllerDelegate {
  private let continuation: CheckedContinuation<[PHPickerResult], Error>

  init(_ continuation: CheckedContinuation<[PHPickerResult], Error>) {
    self.continuation = continuation
  }

  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    picker.dismiss(animated: true)
    continuation.resume(returning: results)
  }
}

public final class FramePhotoStoreModule: Module {
  private var pickerSession: PickerSession?

  public func definition() -> ModuleDefinition {
    Name("FramePhotoStore")

    AsyncFunction("savePhoto") {
      (sourceUri: String, fileName: String, maxPixels: Int, quality: Double) -> [String: Any] in
      guard let url = sourceURL(from: sourceUri) else {
        throw StoreError.unreadableSource(sourceUri)
      }
      let image = try downsample(url: url, maxPixels: maxPixels)
      return try store(image, fileName: fileName, quality: quality)
    }

    // what: PHPicker hands back empty item providers for preselected assets, so the picker opens
    // empty and the photos the user ticks are matched to the copies Frame already holds
    AsyncFunction("rebuildCopies") {
      (fileNamesByAsset: [String: [String]], maxPixels: Int, quality: Double) -> [String: Any] in
      let results: [PHPickerResult] = try await withCheckedThrowingContinuation { continuation in
        DispatchQueue.main.async {
          guard let presenter = self.appContext?.utilities?.currentViewController() else {
            continuation.resume(throwing: StoreError.noPresenter)
            return
          }
          var configuration = PHPickerConfiguration(photoLibrary: .shared())
          configuration.filter = .images
          configuration.selectionLimit = 0
          configuration.preferredAssetRepresentationMode = .current
          let picker = PHPickerViewController(configuration: configuration)
          let session = PickerSession(continuation)
          self.pickerSession = session
          picker.delegate = session
          presenter.present(picker, animated: true)
        }
      }
      self.pickerSession = nil
      var rebuilt: [[String: Any]] = []
      var failures: [String] = []
      var unmatched = 0
      for result in results {
        guard let assetId = result.assetIdentifier, let fileNames = fileNamesByAsset[assetId]
        else {
          unmatched += 1
          continue
        }
        do {
          let copy = try await copiedFile(from: result.itemProvider)
          defer { try? FileManager.default.removeItem(at: copy) }
          let image = try downsample(url: copy, maxPixels: maxPixels)
          for fileName in fileNames {
            var saved = try store(image, fileName: fileName, quality: quality)
            saved["assetId"] = assetId
            rebuilt.append(saved)
          }
        } catch {
          let types = result.itemProvider.registeredTypeIdentifiers.joined(separator: ",")
          failures.append("\(assetId.prefix(8)) [\(types)]: \(error.localizedDescription)")
        }
      }
      return ["rebuilt": rebuilt, "failures": failures, "unmatched": unmatched]
    }

    AsyncFunction("deletePhotos") { (fileNames: [String]) -> Int in
      let directory = try photosDirectory()
      var removed = 0
      for name in fileNames {
        let target = directory.appendingPathComponent(name)
        if FileManager.default.fileExists(atPath: target.path) {
          try? FileManager.default.removeItem(at: target)
          removed += 1
        }
      }
      return removed
    }

    Function("photoUri") { (fileName: String) -> String? in
      guard let directory = try? photosDirectory() else { return nil }
      return directory.appendingPathComponent(fileName).absoluteString
    }

    Function("containerPath") { () -> String? in
      return (try? containerURL())?.path
    }

    Function("setSnapshot") { (key: String, json: String) -> Void in
      UserDefaults(suiteName: appGroup)?.set(json, forKey: key)
    }

    Function("getSnapshot") { (key: String) -> String? in
      return UserDefaults(suiteName: appGroup)?.string(forKey: key)
    }

    Function("reloadWidgets") { () -> Void in
      WidgetCenter.shared.reloadAllTimelines()
    }

    AsyncFunction("placedWidgetCount") { () -> Int in
      try await WidgetCenter.shared.currentConfigurations().count
    }

    AsyncFunction("hashPhotos") { (fileNames: [String]) -> [String: String] in
      let directory = try photosDirectory()
      var digests: [String: String] = [:]
      for name in fileNames {
        let target = directory.appendingPathComponent(name)
        guard let data = try? Data(contentsOf: target, options: .mappedIfSafe) else { continue }
        digests[name] = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
      }
      return digests
    }

    AsyncFunction("usedBytes") { () -> Int in
      let directory = try photosDirectory()
      let keys: [URLResourceKey] = [.fileSizeKey]
      let files = FileManager.default.enumerator(
        at: directory, includingPropertiesForKeys: keys, options: [.skipsHiddenFiles])
      var total = 0
      while let url = files?.nextObject() as? URL {
        total += (try? url.resourceValues(forKeys: Set(keys)))?.fileSize ?? 0
      }
      return total
    }
  }
}
