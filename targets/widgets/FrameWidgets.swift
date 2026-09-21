import AppIntents
import Foundation
import ImageIO
import SQLite3
import SwiftUI
import UIKit
import WidgetKit

// what: two data sources ship so the App Group snapshot and a direct read of the shared
// SQLite file can be compared on device; `widgetSource` in the App Group picks between them.

enum DataSourceKind: String {
  case snapshot
  case sqlite
}

struct Album: Identifiable, Hashable {
  let id: String
  let name: String
  let photos: [String]
}

struct WidgetSettings: Codable {
  var showAlbumTitle: Bool = false
  var showDate: Bool = false
  var fit: String = "fill"
  var shuffle: Bool = false
  var refreshMinutes: Int = 60

  var contentMode: ContentMode { fit == "fit" ? .fit : .fill }
}

enum FrameStore {
  static let appGroup = "group.com.lumen.frame"
  static let snapshotKey = "albums"
  static let settingsKey = "settings"
  static let sourceKey = "widgetSource"
  static let databaseName = "frame.db"
  static let photosDirectory = "photos"

  static func groupDefaults() -> UserDefaults? { UserDefaults(suiteName: appGroup) }

  static func containerURL() -> URL? {
    FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)
  }

  static func photoURL(_ fileName: String) -> URL? {
    containerURL()?.appendingPathComponent(photosDirectory, isDirectory: true)
      .appendingPathComponent(fileName)
  }

  static func settings() -> WidgetSettings {
    guard let raw = groupDefaults()?.string(forKey: settingsKey),
      let data = raw.data(using: .utf8),
      let parsed = try? JSONDecoder().decode(WidgetSettings.self, from: data)
    else { return WidgetSettings() }
    return parsed
  }

  static func sourceKind() -> DataSourceKind {
    let raw = groupDefaults()?.string(forKey: sourceKey) ?? DataSourceKind.snapshot.rawValue
    return DataSourceKind(rawValue: raw) ?? .snapshot
  }

  static func albums() -> [Album] {
    switch sourceKind() {
    case .snapshot: return SnapshotSource.albums()
    case .sqlite: return SQLiteSource.albums()
    }
  }

  static func album(id: String?) -> Album? {
    let all = albums()
    guard let id else { return all.first }
    return all.first(where: { $0.id == id }) ?? all.first
  }
}

private struct SnapshotAlbum: Codable {
  let id: String
  let name: String
  let photos: [String]
}

private struct SnapshotPayload: Codable {
  let albums: [SnapshotAlbum]
  let generatedAt: Double?
}

enum SnapshotSource {
  static func albums() -> [Album] {
    guard let raw = FrameStore.groupDefaults()?.string(forKey: FrameStore.snapshotKey),
      let data = raw.data(using: .utf8),
      let payload = try? JSONDecoder().decode(SnapshotPayload.self, from: data)
    else { return [] }
    return payload.albums.map { Album(id: $0.id, name: $0.name, photos: $0.photos) }
  }
}

enum SQLiteSource {
  private static let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

  static func albums() -> [Album] {
    guard let path = FrameStore.containerURL()?.appendingPathComponent(FrameStore.databaseName).path
    else { return [] }
    guard FileManager.default.fileExists(atPath: path) else { return [] }

    var handle: OpaquePointer?
    guard sqlite3_open_v2(path, &handle, SQLITE_OPEN_READONLY, nil) == SQLITE_OK else {
      sqlite3_close(handle)
      return []
    }
    defer { sqlite3_close(handle) }

    let sql = """
      SELECT a.id, a.name, p.file_name
      FROM albums a
      LEFT JOIN photos p ON p.album_id = a.id
      ORDER BY a.sort_order ASC, a.created_at ASC, p.sort_order ASC, p.created_at ASC
      """
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(handle, sql, -1, &statement, nil) == SQLITE_OK else { return [] }
    defer { sqlite3_finalize(statement) }

    var order: [String] = []
    var names: [String: String] = [:]
    var grouped: [String: [String]] = [:]

    while sqlite3_step(statement) == SQLITE_ROW {
      guard let idText = sqlite3_column_text(statement, 0) else { continue }
      let id = String(cString: idText)
      if names[id] == nil {
        order.append(id)
        names[id] = sqlite3_column_text(statement, 1).map { String(cString: $0) } ?? ""
        grouped[id] = []
      }
      if let fileText = sqlite3_column_text(statement, 2) {
        grouped[id]?.append(String(cString: fileText))
      }
    }

    return order.map { Album(id: $0, name: names[$0] ?? "", photos: grouped[$0] ?? []) }
  }
}

// MARK: - Memory-safe image loading

enum PhotoLoader {
  static func image(fileName: String?, maxPixels: Int) -> Image? {
    guard let fileName, !fileName.isEmpty, let url = FrameStore.photoURL(fileName) else {
      return nil
    }
    let sourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
    guard let source = CGImageSourceCreateWithURL(url as CFURL, sourceOptions) else { return nil }
    let options =
      [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceShouldCacheImmediately: true,
        kCGImageSourceThumbnailMaxPixelSize: maxPixels,
      ] as CFDictionary
    guard let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, options) else {
      return nil
    }
    return Image(decorative: thumbnail, scale: 1)
  }

  static func maxPixels(for family: WidgetFamily) -> Int {
    switch family {
    case .systemSmall: return 520
    case .systemMedium: return 820
    case .systemLarge: return 900
    case .systemExtraLarge: return 1200
    default: return 640
    }
  }
}

// MARK: - Album picker shown in the widget's edit sheet

struct AlbumEntity: AppEntity {
  let id: String
  let name: String
  let count: Int

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Album"
  static var defaultQuery = AlbumQuery()

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(
      title: "\(name)",
      subtitle: count == 1 ? "1 photo" : "\(count) photos")
  }
}

struct AlbumQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [AlbumEntity] {
    FrameStore.albums()
      .filter { identifiers.contains($0.id) }
      .map { AlbumEntity(id: $0.id, name: $0.name, count: $0.photos.count) }
  }

  func suggestedEntities() async throws -> [AlbumEntity] {
    FrameStore.albums().map { AlbumEntity(id: $0.id, name: $0.name, count: $0.photos.count) }
  }

  func defaultResult() async -> AlbumEntity? {
    try? await suggestedEntities().first
  }
}

struct SelectAlbumIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Choose Album"
  static var description = IntentDescription("Pick which album this widget shows.")

  @Parameter(title: "Album")
  var album: AlbumEntity?

  @Parameter(title: "Shuffle", default: false)
  var shuffle: Bool

  init() {}
  init(album: AlbumEntity?, shuffle: Bool) {
    self.album = album
    self.shuffle = shuffle
  }
}

// MARK: - Timeline

struct PhotoEntry: TimelineEntry {
  let date: Date
  let fileName: String?
  let albumName: String
  let position: Int
  let total: Int
  let settings: WidgetSettings
}

struct PhotoProvider: AppIntentTimelineProvider {
  private static let maxEntries = 24

  func placeholder(in context: Context) -> PhotoEntry {
    let album = FrameStore.albums().first
    return PhotoEntry(
      date: Date(),
      fileName: album?.photos.first,
      albumName: album?.name ?? "Frame",
      position: 0,
      total: album?.photos.count ?? 0,
      settings: FrameStore.settings())
  }

  func snapshot(for configuration: SelectAlbumIntent, in context: Context) async -> PhotoEntry {
    entries(for: configuration).first ?? placeholder(in: context)
  }

  func timeline(for configuration: SelectAlbumIntent, in context: Context) async -> Timeline<
    PhotoEntry
  > {
    let built = entries(for: configuration)
    guard let last = built.last else {
      return Timeline(entries: [placeholder(in: context)], policy: .after(Date().addingTimeInterval(3600)))
    }
    return Timeline(entries: built, policy: .after(last.date.addingTimeInterval(60)))
  }

  private func entries(for configuration: SelectAlbumIntent) -> [PhotoEntry] {
    let settings = FrameStore.settings()
    guard let album = FrameStore.album(id: configuration.album?.id), !album.photos.isEmpty else {
      return [
        PhotoEntry(
          date: Date(), fileName: nil, albumName: configuration.album?.name ?? "Frame",
          position: 0, total: 0, settings: settings)
      ]
    }

    let shuffled = configuration.shuffle || settings.shuffle
    let ordered = shuffled ? album.photos.shuffled() : album.photos
    let interval = TimeInterval(max(1, settings.refreshMinutes) * 60)
    let start = Date()
    let count = min(Self.maxEntries, max(1, ordered.count))

    return (0..<count).map { index in
      PhotoEntry(
        date: start.addingTimeInterval(TimeInterval(index) * interval),
        fileName: ordered[index % ordered.count],
        albumName: album.name,
        position: index % ordered.count,
        total: ordered.count,
        settings: settings)
    }
  }
}

// MARK: - Views

struct EmptyFrameView: View {
  var body: some View {
    VStack(spacing: 8) {
      Image(systemName: "photo.on.rectangle.angled")
        .font(.system(size: 26, weight: .light))
        .foregroundStyle(.secondary)
      Text("Pick an album")
        .font(.system(size: 13, weight: .medium))
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

struct PhotoWidgetView: View {
  @Environment(\.widgetFamily) private var family
  @Environment(\.widgetRenderingMode) private var renderingMode
  let entry: PhotoEntry

  private var overlayText: Bool {
    entry.settings.showAlbumTitle || entry.settings.showDate
  }

  var body: some View {
    content
      .containerBackground(for: .widget) {
        if let image = PhotoLoader.image(
          fileName: entry.fileName, maxPixels: PhotoLoader.maxPixels(for: family)),
          renderingMode == .fullColor
        {
          image
            .resizable()
            .widgetAccentedRenderingMode(.fullColor)
            .aspectRatio(contentMode: entry.settings.contentMode)
        } else {
          Color(white: 0.07)
        }
      }
  }

  @ViewBuilder private var content: some View {
    if entry.fileName == nil {
      EmptyFrameView()
    } else if overlayText {
      VStack(alignment: .leading, spacing: 0) {
        Spacer(minLength: 0)
        VStack(alignment: .leading, spacing: 2) {
          if entry.settings.showAlbumTitle {
            Text(entry.albumName)
              .font(.system(size: family == .systemSmall ? 13 : 15, weight: .semibold))
              .foregroundStyle(.white)
              .lineLimit(1)
              .shadow(color: .black.opacity(0.55), radius: 3, y: 1)
          }
          if entry.settings.showDate {
            Text(entry.date, style: .date)
              .font(.system(size: family == .systemSmall ? 11 : 12, weight: .medium))
              .foregroundStyle(.white.opacity(0.85))
              .shadow(color: .black.opacity(0.55), radius: 3, y: 1)
          }
        }
        .padding(.horizontal, 14)
        .padding(.bottom, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
          LinearGradient(
            colors: [.clear, .black.opacity(0.45)], startPoint: .top, endPoint: .bottom)
        )
      }
    } else {
      Color.clear
    }
  }
}

struct PhotoWidget: Widget {
  let kind = "FramePhotoWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(
      kind: kind, intent: SelectAlbumIntent.self, provider: PhotoProvider()
    ) { entry in
      PhotoWidgetView(entry: entry)
    }
    .configurationDisplayName("Photo")
    .description("Show photos from one of your albums.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .systemExtraLarge])
    .contentMarginsDisabled()
  }
}

@main
struct FrameWidgetBundle: WidgetBundle {
  var body: some Widget {
    PhotoWidget()
  }
}
