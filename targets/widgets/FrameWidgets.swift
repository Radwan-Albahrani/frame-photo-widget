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
  let groupId: String?
  let photos: [String]
}

struct PhotoGroup: Identifiable, Hashable {
  let id: String
  let name: String
  let parentId: String?
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

  static func groups() -> [PhotoGroup] {
    switch sourceKind() {
    case .snapshot: return SnapshotSource.groups()
    case .sqlite: return SQLiteSource.groups()
    }
  }

  /// Every group in the subtree rooted at `id`, so a folder plays its nested folders too.
  static func descendantGroupIds(of id: String) -> Set<String> {
    let all = groups()
    var collected: Set<String> = [id]
    var frontier: Set<String> = [id]
    while !frontier.isEmpty {
      let next = all.filter { group in
        guard let parent = group.parentId else { return false }
        return frontier.contains(parent)
      }
      let fresh = Set(next.map { $0.id }).subtracting(collected)
      if fresh.isEmpty { break }
      collected.formUnion(fresh)
      frontier = fresh
    }
    return collected
  }

  /// A specific album wins; otherwise a whole group is flattened into one rotating set.
  static func resolve(albumId: String?, groupId: String?) -> Album? {
    let all = albums()
    if let albumId, let match = all.first(where: { $0.id == albumId }) { return match }
    if let groupId {
      let branch = descendantGroupIds(of: groupId)
      let members = all.filter { album in
        guard let albumGroup = album.groupId else { return false }
        return branch.contains(albumGroup)
      }
      if !members.isEmpty {
        let name = groups().first(where: { $0.id == groupId })?.name ?? ""
        return Album(
          id: groupId, name: name, groupId: groupId,
          photos: members.flatMap { $0.photos })
      }
    }
    return all.first
  }
}

private struct SnapshotAlbum: Codable {
  let id: String
  let name: String
  let groupId: String?
  let photos: [String]
}

private struct SnapshotGroup: Codable {
  let id: String
  let name: String
  let parentId: String?
}

private struct SnapshotPayload: Codable {
  let albums: [SnapshotAlbum]
  let groups: [SnapshotGroup]?
  let generatedAt: Double?
}

enum SnapshotSource {
  private static func payload() -> SnapshotPayload? {
    guard let raw = FrameStore.groupDefaults()?.string(forKey: FrameStore.snapshotKey),
      let data = raw.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(SnapshotPayload.self, from: data)
  }

  static func albums() -> [Album] {
    (payload()?.albums ?? []).map {
      Album(id: $0.id, name: $0.name, groupId: $0.groupId, photos: $0.photos)
    }
  }

  static func groups() -> [PhotoGroup] {
    (payload()?.groups ?? []).map { PhotoGroup(id: $0.id, name: $0.name, parentId: $0.parentId) }
  }
}

enum SQLiteSource {
  private static func openDatabase() -> OpaquePointer? {
    guard let path = FrameStore.containerURL()?.appendingPathComponent(FrameStore.databaseName).path,
      FileManager.default.fileExists(atPath: path)
    else { return nil }
    var handle: OpaquePointer?
    guard sqlite3_open_v2(path, &handle, SQLITE_OPEN_READONLY, nil) == SQLITE_OK else {
      sqlite3_close(handle)
      return nil
    }
    return handle
  }

  static func albums() -> [Album] {
    guard let handle = openDatabase() else { return [] }
    defer { sqlite3_close(handle) }

    let sql = """
      SELECT a.id, a.name, a.group_id, p.file_name
      FROM albums a
      LEFT JOIN photos p ON p.album_id = a.id
      ORDER BY a.sort_order ASC, a.created_at ASC, p.sort_order ASC, p.created_at ASC
      """
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(handle, sql, -1, &statement, nil) == SQLITE_OK else { return [] }
    defer { sqlite3_finalize(statement) }

    var order: [String] = []
    var names: [String: String] = [:]
    var groupIds: [String: String?] = [:]
    var grouped: [String: [String]] = [:]

    while sqlite3_step(statement) == SQLITE_ROW {
      guard let idText = sqlite3_column_text(statement, 0) else { continue }
      let id = String(cString: idText)
      if names[id] == nil {
        order.append(id)
        names[id] = sqlite3_column_text(statement, 1).map { String(cString: $0) } ?? ""
        groupIds[id] = sqlite3_column_text(statement, 2).map { String(cString: $0) }
        grouped[id] = []
      }
      if let fileText = sqlite3_column_text(statement, 3) {
        grouped[id]?.append(String(cString: fileText))
      }
    }

    return order.map {
      Album(
        id: $0, name: names[$0] ?? "", groupId: groupIds[$0] ?? nil,
        photos: grouped[$0] ?? [])
    }
  }

  static func groups() -> [PhotoGroup] {
    guard let handle = openDatabase() else { return [] }
    defer { sqlite3_close(handle) }

    let sql =
      "SELECT id, name, parent_id FROM album_groups ORDER BY sort_order ASC, created_at ASC"
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(handle, sql, -1, &statement, nil) == SQLITE_OK else { return [] }
    defer { sqlite3_finalize(statement) }

    var result: [PhotoGroup] = []
    while sqlite3_step(statement) == SQLITE_ROW {
      guard let idText = sqlite3_column_text(statement, 0) else { continue }
      let name = sqlite3_column_text(statement, 1).map { String(cString: $0) } ?? ""
      let parent = sqlite3_column_text(statement, 2).map { String(cString: $0) }
      result.append(PhotoGroup(id: String(cString: idText), name: name, parentId: parent))
    }
    return result
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
  let groupName: String?

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Album"
  static var defaultQuery = AlbumQuery()

  var displayRepresentation: DisplayRepresentation {
    let photos = count == 1 ? "1 photo" : "\(count) photos"
    guard let groupName, !groupName.isEmpty else {
      return DisplayRepresentation(title: "\(name)", subtitle: "\(photos)")
    }
    return DisplayRepresentation(title: "\(name)", subtitle: "\(groupName) · \(photos)")
  }
}

struct AlbumQuery: EntityQuery {
  // what: ties the album list to the chosen group so long lists filter down
  @IntentParameterDependency<SelectAlbumIntent>(\.$group)
  var selection

  private func entity(_ album: Album, groups: [PhotoGroup]) -> AlbumEntity {
    let groupName = groups.first(where: { $0.id == album.groupId })?.name
    return AlbumEntity(
      id: album.id, name: album.name, count: album.photos.count, groupName: groupName)
  }

  func entities(for identifiers: [String]) async throws -> [AlbumEntity] {
    let groups = FrameStore.groups()
    return FrameStore.albums()
      .filter { identifiers.contains($0.id) }
      .map { entity($0, groups: groups) }
  }

  func suggestedEntities() async throws -> [AlbumEntity] {
    let groups = FrameStore.groups()
    let groupId = selection?.group.id
    return FrameStore.albums()
      .filter { groupId == nil || $0.groupId == groupId }
      .map { entity($0, groups: groups) }
  }

  func defaultResult() async -> AlbumEntity? {
    try? await suggestedEntities().first
  }
}

struct GroupEntity: AppEntity {
  let id: String
  let name: String
  let albumCount: Int
  let photoCount: Int

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Group"
  static var defaultQuery = GroupQuery()

  var displayRepresentation: DisplayRepresentation {
    let albums = albumCount == 1 ? "1 album" : "\(albumCount) albums"
    let photos = photoCount == 1 ? "1 photo" : "\(photoCount) photos"
    return DisplayRepresentation(title: "\(name)", subtitle: "\(albums) · \(photos)")
  }
}

struct GroupQuery: EntityQuery {
  private func all() -> [GroupEntity] {
    let albums = FrameStore.albums()
    return FrameStore.groups().map { group in
      let members = albums.filter { $0.groupId == group.id }
      return GroupEntity(
        id: group.id,
        name: group.name,
        albumCount: members.count,
        photoCount: members.reduce(0) { $0 + $1.photos.count })
    }
  }

  func entities(for identifiers: [String]) async throws -> [GroupEntity] {
    all().filter { identifiers.contains($0.id) }
  }

  func suggestedEntities() async throws -> [GroupEntity] {
    all()
  }
}

struct SelectAlbumIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Choose Photos"
  static var description = IntentDescription(
    "Show one album, or every album in a group.")

  @Parameter(title: "Group")
  var group: GroupEntity?

  @Parameter(title: "Album")
  var album: AlbumEntity?

  @Parameter(title: "Shuffle", default: false)
  var shuffle: Bool

  static var parameterSummary: some ParameterSummary {
    Summary {
      \.$group
      \.$album
      \.$shuffle
    }
  }

  init() {}
  init(group: GroupEntity?, album: AlbumEntity?, shuffle: Bool) {
    self.group = group
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
  // what: entries are strings, so a long timeline costs bytes and needs no reload to advance
  private static let maxEntries = 120
  private static let targetSpanSeconds: TimeInterval = 6 * 3600

  /// Deterministic shuffle: the same album always shuffles the same way, so a reload
  /// does not hand the viewer a brand-new random photo.
  private static func shuffled(_ photos: [String], seed: String) -> [String] {
    var state = UInt64(abs(seed.hashValue)) | 1
    var working = photos
    var index = working.count - 1
    while index > 0 {
      state = state &* 6364136223846793005 &+ 1442695040888963407
      let pick = Int(state >> 33) % (index + 1)
      working.swapAt(index, pick)
      index -= 1
    }
    return working
  }

  func placeholder(in context: Context) -> PhotoEntry {
    let album = FrameStore.resolve(albumId: nil, groupId: nil)
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
    guard
      let album = FrameStore.resolve(
        albumId: configuration.album?.id, groupId: configuration.group?.id),
      !album.photos.isEmpty
    else {
      return [
        PhotoEntry(
          date: Date(), fileName: nil, albumName: configuration.album?.name ?? "Frame",
          position: 0, total: 0, settings: settings)
      ]
    }

    let interval = TimeInterval(max(1, settings.refreshMinutes) * 60)
    // what: anchoring to absolute time keeps a reload from restarting the rotation
    let slot = (Date().timeIntervalSince1970 / interval).rounded(.down)
    let slotStart = Date(timeIntervalSince1970: slot * interval)

    let shuffled = configuration.shuffle || settings.shuffle
    let ordered = shuffled ? Self.shuffled(album.photos, seed: album.id) : album.photos
    let stepsForSpan = Int(Self.targetSpanSeconds / interval) + 1
    let count = min(Self.maxEntries, max(ordered.count, stepsForSpan))
    let offset = Int(slot.truncatingRemainder(dividingBy: Double(ordered.count)))

    return (0..<count).map { index in
      let position = (offset + index) % ordered.count
      return PhotoEntry(
        date: slotStart.addingTimeInterval(TimeInterval(index) * interval),
        fileName: ordered[position],
        albumName: album.name,
        position: position,
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

  private static func titleSize(for family: WidgetFamily) -> CGFloat {
    switch family {
    case .systemSmall: return 13
    case .systemMedium: return 15
    case .systemLarge: return 17
    case .systemExtraLarge: return 19
    default: return 15
    }
  }

  private static func padding(for family: WidgetFamily) -> CGFloat {
    family == .systemSmall ? 14 : 18
  }

  var body: some View {
    content
      .containerBackground(for: .widget) { backdrop }
  }

  // what: one decode reused for both layers, so `fit` costs no extra memory
  @ViewBuilder private var backdrop: some View {
    if let image = PhotoLoader.image(
      fileName: entry.fileName, maxPixels: PhotoLoader.maxPixels(for: family)),
      renderingMode == .fullColor
    {
      if entry.settings.contentMode == .fit {
        ZStack {
          image
            .resizable()
            .widgetAccentedRenderingMode(.fullColor)
            .aspectRatio(contentMode: .fill)
            .blur(radius: 24, opaque: true)
            .overlay(Color.black.opacity(0.28))
          image
            .resizable()
            .widgetAccentedRenderingMode(.fullColor)
            .aspectRatio(contentMode: .fit)
        }
      } else {
        image
          .resizable()
          .widgetAccentedRenderingMode(.fullColor)
          .aspectRatio(contentMode: .fill)
      }
    } else {
      Color(white: 0.07)
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
              .font(.system(size: Self.titleSize(for: family), weight: .semibold))
              .foregroundStyle(.white)
              .lineLimit(1)
              .shadow(color: .black.opacity(0.55), radius: 3, y: 1)
          }
          if entry.settings.showDate {
            Text(entry.date, style: .date)
              .font(.system(size: Self.titleSize(for: family) - 2, weight: .medium))
              .foregroundStyle(.white.opacity(0.85))
              .shadow(color: .black.opacity(0.55), radius: 3, y: 1)
          }
        }
        .padding(.horizontal, Self.padding(for: family))
        .padding(.bottom, Self.padding(for: family) - 2)
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
    .description("Show photos from an album, or a whole group of albums.")
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
