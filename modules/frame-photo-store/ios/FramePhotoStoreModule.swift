import CryptoKit
import ExpoModulesCore
import ImageIO
import UIKit
import UniformTypeIdentifiers
import WidgetKit

private let appGroup = "group.com.lumen.frame"
private let photosDirectoryName = "photos"

private enum StoreError: Error, LocalizedError {
  case missingContainer
  case unreadableSource(String)
  case encodingFailed

  var errorDescription: String? {
    switch self {
    case .missingContainer:
      return "App Group \(appGroup) is not reachable. Check the entitlement on both the app and the widget."
    case .unreadableSource(let uri):
      return "Could not read an image at \(uri)."
    case .encodingFailed:
      return "Could not encode the downsampled image as JPEG."
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

public final class FramePhotoStoreModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FramePhotoStore")

    AsyncFunction("savePhoto") {
      (sourceUri: String, fileName: String, maxPixels: Int, quality: Double) -> [String: Any] in
      guard let url = sourceURL(from: sourceUri) else {
        throw StoreError.unreadableSource(sourceUri)
      }
      let image = try downsample(url: url, maxPixels: maxPixels)
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

    AsyncFunction("usedBytes") { () -> Int in
      let directory = try photosDirectory()
      let names = try FileManager.default.contentsOfDirectory(atPath: directory.path)
      var total = 0
      for name in names {
        let attributes = try? FileManager.default.attributesOfItem(
          atPath: directory.appendingPathComponent(name).path)
        total += (attributes?[.size] as? Int) ?? 0
      }
      return total
    }
  }
}
