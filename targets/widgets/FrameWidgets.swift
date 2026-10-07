import AppIntents
import Foundation
import ImageIO
import SQLite3
import SwiftUI
import UIKit
import WidgetKit

struct Album: Identifiable, Hashable {
  let id: String
  let name: String
  let groupId: String?
  let photos: [String]
}

struct AlbumSummary: Identifiable, Hashable {
  let id: String
  let name: String
  let groupId: String?
  let photoCount: Int
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
  var refreshMinutes: Int = 60

  var contentMode: ContentMode { fit == "fit" ? .fit : .fill }
}

enum FrameStore {
  static let appGroup = "group.com.lumen.frame"
  static let settingsKey = "settings"
  static let statusKey = "widgetStatus"
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

  private static let statusLock = NSLock()

  private static func statusRecords(_ defaults: UserDefaults) -> [String: Any] {
    guard let raw = defaults.string(forKey: statusKey), let data = raw.data(using: .utf8),
      let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else { return [:] }
    return parsed
  }

  static func startedAt(key: String) -> Date? {
    guard let defaults = groupDefaults() else { return nil }
    statusLock.lock()
    defer { statusLock.unlock() }
    guard let record = statusRecords(defaults)[key] as? [String: Any],
      let millis = (record["startedAt"] as? NSNumber)?.doubleValue
    else { return nil }
    return Date(timeIntervalSince1970: millis / 1000)
  }

  static func recordStatus(_ record: [String: Any], key: String, placedKeys: Set<String>?) {
    guard let defaults = groupDefaults() else { return }
    statusLock.lock()
    defer { statusLock.unlock() }
    var all = statusRecords(defaults)
    if let placedKeys, placedKeys.contains(key) { all = all.filter { placedKeys.contains($0.key) } }
    all[key] = record
    guard let data = try? JSONSerialization.data(withJSONObject: all),
      let json = String(data: data, encoding: .utf8)
    else { return }
    defaults.set(json, forKey: statusKey)
  }

  static func databasePath() -> String? {
    containerURL()?.appendingPathComponent(databaseName).path
  }

  static func summaries() -> [AlbumSummary]? {
    try? LibraryDatabase.read(path: databasePath()) { $0.summaries() }.get()
  }

  static func groups() -> [PhotoGroup]? {
    try? LibraryDatabase.read(path: databasePath()) { $0.groups() }.get()
  }

  static func resolve(albumId: String?, groupId: String?) -> Result<Album?, LibraryReadError> {
    LibraryDatabase.read(path: databasePath()) { $0.resolve(albumId: albumId, groupId: groupId) }
  }
}

struct LibraryReadError: Error {
  let code: Int32
}

// what: reads only the shown album or folder, so memory stays flat as the library grows (docs/widgets.md)
final class LibraryDatabase {
  // what: widgets reloading together race on WAL recovery; 32% rendered the wrong album without it (docs/widgets.md)
  private static let busyTimeoutMilliseconds: Int32 = 2000

  private let handle: OpaquePointer
  private var failureCode: Int32?

  private init(handle: OpaquePointer) { self.handle = handle }

  static func read<Value>(
    path: String?, _ body: (LibraryDatabase) -> Value
  ) -> Result<Value, LibraryReadError> {
    guard let path, FileManager.default.fileExists(atPath: path) else {
      return .failure(LibraryReadError(code: SQLITE_CANTOPEN))
    }
    let result = read(path: path, flags: SQLITE_OPEN_READONLY, body)
    guard case .failure(let error) = result, error.code == SQLITE_CANTOPEN else { return result }
    // what: a clean app close deletes -wal/-shm, and only a writable open recreates them (docs/widgets.md)
    return read(path: path, flags: SQLITE_OPEN_READWRITE, body)
  }

  private static func read<Value>(
    path: String, flags: Int32, _ body: (LibraryDatabase) -> Value
  ) -> Result<Value, LibraryReadError> {
    var handle: OpaquePointer?
    let opened = sqlite3_open_v2(path, &handle, flags, nil)
    guard opened == SQLITE_OK, let handle else {
      sqlite3_close(handle)
      return .failure(LibraryReadError(code: opened))
    }
    defer { sqlite3_close(handle) }
    sqlite3_busy_timeout(handle, busyTimeoutMilliseconds)
    let database = LibraryDatabase(handle: handle)
    let value = body(database)
    if let code = database.failureCode { return .failure(LibraryReadError(code: code)) }
    return .success(value)
  }

  private func rows(_ sql: String, _ bindings: [String] = [], _ row: (OpaquePointer) -> Void) {
    var statement: OpaquePointer?
    let prepared = sqlite3_prepare_v2(handle, sql, -1, &statement, nil)
    guard prepared == SQLITE_OK, let statement else {
      failureCode = failureCode ?? prepared
      return
    }
    defer { sqlite3_finalize(statement) }
    let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
    for (index, value) in bindings.enumerated() {
      sqlite3_bind_text(statement, Int32(index + 1), value, -1, transient)
    }
    var stepped = sqlite3_step(statement)
    while stepped == SQLITE_ROW {
      row(statement)
      stepped = sqlite3_step(statement)
    }
    if stepped != SQLITE_DONE { failureCode = failureCode ?? stepped }
  }

  private static func text(_ statement: OpaquePointer, _ column: Int32) -> String? {
    sqlite3_column_text(statement, column).map { String(cString: $0) }
  }

  func groups() -> [PhotoGroup] {
    var result: [PhotoGroup] = []
    rows("SELECT id, name, parent_id FROM album_groups ORDER BY sort_order ASC, created_at ASC") {
      guard let id = Self.text($0, 0) else { return }
      result.append(PhotoGroup(id: id, name: Self.text($0, 1) ?? "", parentId: Self.text($0, 2)))
    }
    return result
  }

  func summaries() -> [AlbumSummary] {
    var result: [AlbumSummary] = []
    rows(
      """
      SELECT a.id, a.name, a.group_id, COUNT(p.id)
      FROM albums a LEFT JOIN photos p ON p.album_id = a.id
      GROUP BY a.id
      ORDER BY a.sort_order ASC, a.created_at ASC
      """
    ) {
      guard let id = Self.text($0, 0) else { return }
      result.append(
        AlbumSummary(
          id: id, name: Self.text($0, 1) ?? "", groupId: Self.text($0, 2),
          photoCount: Int(sqlite3_column_int64($0, 3))))
    }
    return result
  }

  private func album(where condition: String, _ bindings: [String]) -> (id: String, name: String, groupId: String?)? {
    var found: (id: String, name: String, groupId: String?)?
    rows(
      "SELECT id, name, group_id FROM albums WHERE \(condition) ORDER BY sort_order ASC, created_at ASC LIMIT 1",
      bindings
    ) {
      guard let id = Self.text($0, 0) else { return }
      found = (id, Self.text($0, 1) ?? "", Self.text($0, 2))
    }
    return found
  }

  private func photos(inAlbums condition: String, _ bindings: [String]) -> [String] {
    var names: [String] = []
    rows(
      """
      SELECT p.file_name FROM albums a JOIN photos p ON p.album_id = a.id
      WHERE \(condition)
      ORDER BY a.sort_order ASC, a.created_at ASC, p.sort_order ASC, p.created_at ASC
      """,
      bindings
    ) {
      if let name = Self.text($0, 0) { names.append(name) }
    }
    return names
  }

  private func branch(of id: String) -> [String] {
    let all = groups()
    var collected: [String] = [id]
    var frontier: Set<String> = [id]
    while !frontier.isEmpty {
      let fresh = all.filter { group in
        guard let parent = group.parentId else { return false }
        return frontier.contains(parent) && !collected.contains(group.id)
      }.map { $0.id }
      collected.append(contentsOf: fresh)
      frontier = Set(fresh)
    }
    return collected
  }

  func resolve(albumId: String?, groupId: String?) -> Album? {
    if let albumId, let match = album(where: "id = ?", [albumId]) {
      return Album(
        id: match.id, name: match.name, groupId: match.groupId,
        photos: photos(inAlbums: "a.id = ?", [albumId]))
    }
    if let groupId {
      let ids = branch(of: groupId)
      let placeholders = Array(repeating: "?", count: ids.count).joined(separator: ",")
      if album(where: "group_id IN (\(placeholders))", ids) != nil {
        let name = groups().first(where: { $0.id == groupId })?.name ?? ""
        return Album(
          id: groupId, name: name, groupId: groupId,
          photos: photos(inAlbums: "a.group_id IN (\(placeholders))", ids))
      }
    }
    guard albumId == nil, groupId == nil, let first = album(where: "1 = 1", []) else { return nil }
    return Album(
      id: first.id, name: first.name, groupId: first.groupId,
      photos: photos(inAlbums: "a.id = ?", [first.id]))
  }
}

// MARK: - Memory-safe image loading

enum PhotoLoader {
  static func image(fileName: String?, frame: CGSize, fit: Bool) -> Image? {
    guard let data = jpeg(fileName: fileName, frame: frame, fit: fit), let ui = UIImage(data: data)
    else { return nil }
    return Image(uiImage: ui)
  }

  // what: WidgetKit archives a UIImage's JPEG bytes as-is but re-encodes a CGImage losslessly at 4x the size
  static func jpeg(fileName: String?, frame: CGSize, fit: Bool) -> Data? {
    autoreleasepool { encode(fileName: fileName, frame: frame, fit: fit) }
  }

  private static func encode(fileName: String?, frame: CGSize, fit: Bool) -> Data? {
    guard let fileName, !fileName.isEmpty, let url = FrameStore.photoURL(fileName),
      let source = CGImageSourceCreateWithURL(
        url as CFURL, [kCGImageSourceShouldCache: false] as CFDictionary),
      let size = pixelSize(of: source), size.width > 0, size.height > 0
    else { return nil }
    let ratios = (frame.width / size.width, frame.height / size.height)
    let scale = min(fit ? min(ratios.0, ratios.1) : max(ratios.0, ratios.1), 1)
    let longEdge = Int((max(size.width, size.height) * scale).rounded(.up))
    guard let decoded = thumbnail(source, maxPixels: longEdge) else { return nil }
    let visible = fit ? decoded : cropped(decoded, toAspectOf: frame)
    return UIImage(cgImage: visible).jpegData(compressionQuality: 0.9)
  }

  private static func pixelSize(of source: CGImageSource) -> CGSize? {
    guard let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
      let width = (properties[kCGImagePropertyPixelWidth] as? NSNumber)?.doubleValue,
      let height = (properties[kCGImagePropertyPixelHeight] as? NSNumber)?.doubleValue
    else { return nil }
    let orientation = (properties[kCGImagePropertyOrientation] as? NSNumber)?.intValue ?? 1
    return orientation >= 5
      ? CGSize(width: height, height: width) : CGSize(width: width, height: height)
  }

  private static func thumbnail(_ source: CGImageSource, maxPixels: Int) -> CGImage? {
    let options =
      [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceShouldCacheImmediately: true,
        kCGImageSourceThumbnailMaxPixelSize: maxPixels,
      ] as CFDictionary
    return CGImageSourceCreateThumbnailAtIndex(source, 0, options)
  }

  private static func cropped(_ image: CGImage, toAspectOf frame: CGSize) -> CGImage {
    let width = CGFloat(image.width)
    let height = CGFloat(image.height)
    let aspect = frame.width / frame.height
    var cropWidth = width
    var cropHeight = height
    if width / height > aspect {
      cropWidth = (height * aspect).rounded(.down)
    } else {
      cropHeight = (width / aspect).rounded(.down)
    }
    let origin = CGPoint(
      x: ((width - cropWidth) / 2).rounded(.down), y: ((height - cropHeight) / 2).rounded(.down))
    let rect = CGRect(origin: origin, size: CGSize(width: cropWidth, height: cropHeight))
    return image.cropping(to: rect) ?? image
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
  static let wholeGroupId = "frame.wholeGroup"

  static func wholeGroup(photoCount: Int) -> AlbumEntity {
    AlbumEntity(id: wholeGroupId, name: "Whole group", count: photoCount, groupName: nil)
  }

  var chosenAlbumId: String? { id == Self.wholeGroupId ? nil : id }

  var displayRepresentation: DisplayRepresentation {
    let photos = count == 1 ? "1 photo" : "\(count) photos"
    if id == Self.wholeGroupId {
      return DisplayRepresentation(title: "\(name)", subtitle: "Every album in the group · \(photos)")
    }
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

  private func entity(_ album: AlbumSummary, groups: [PhotoGroup]) -> AlbumEntity {
    let groupName = groups.first(where: { $0.id == album.groupId })?.name
    return AlbumEntity(
      id: album.id, name: album.name, count: album.photoCount, groupName: groupName)
  }

  func entities(for identifiers: [String]) async throws -> [AlbumEntity] {
    guard let summaries = FrameStore.summaries(), let groups = FrameStore.groups() else {
      return identifiers.map { AlbumEntity(id: $0, name: "", count: 0, groupName: nil) }
    }
    let albums = summaries
      .filter { identifiers.contains($0.id) }
      .map { entity($0, groups: groups) }
    guard identifiers.contains(AlbumEntity.wholeGroupId) else { return albums }
    return [AlbumEntity.wholeGroup(photoCount: 0)] + albums
  }

  func suggestedEntities() async throws -> [AlbumEntity] {
    let groups = FrameStore.groups() ?? []
    let summaries = FrameStore.summaries() ?? []
    guard let groupId = selection?.group.chosenGroupId else {
      return summaries.map { entity($0, groups: groups) }
    }
    let members = summaries
      .filter { $0.groupId == groupId }
      .map { entity($0, groups: groups) }
    let photos = members.reduce(0) { $0 + $1.count }
    return [AlbumEntity.wholeGroup(photoCount: photos)] + members
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
  static let noGroupId = "frame.noGroup"
  static let noGroup = GroupEntity(id: noGroupId, name: "No group", albumCount: 0, photoCount: 0)

  var chosenGroupId: String? { id == Self.noGroupId ? nil : id }

  var displayRepresentation: DisplayRepresentation {
    if id == Self.noGroupId {
      return DisplayRepresentation(title: "\(name)", subtitle: "Pick from every album")
    }
    let albums = albumCount == 1 ? "1 album" : "\(albumCount) albums"
    let photos = photoCount == 1 ? "1 photo" : "\(photoCount) photos"
    return DisplayRepresentation(title: "\(name)", subtitle: "\(albums) · \(photos)")
  }
}

struct GroupQuery: EntityQuery {
  private func all() -> [GroupEntity]? {
    guard let albums = FrameStore.summaries(), let groups = FrameStore.groups() else { return nil }
    return groups.map { group in
      let members = albums.filter { $0.groupId == group.id }
      return GroupEntity(
        id: group.id,
        name: group.name,
        albumCount: members.count,
        photoCount: members.reduce(0) { $0 + $1.photoCount })
    }
  }

  func entities(for identifiers: [String]) async throws -> [GroupEntity] {
    guard let groups = all() else {
      return identifiers.map { GroupEntity(id: $0, name: "", albumCount: 0, photoCount: 0) }
    }
    return ([GroupEntity.noGroup] + groups).filter { identifiers.contains($0.id) }
  }

  func suggestedEntities() async throws -> [GroupEntity] {
    [GroupEntity.noGroup] + (all() ?? [])
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

  var groupId: String? { group?.chosenGroupId }
  var albumId: String? { album?.chosenAlbumId }

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
  let albumId: String?
  let albumName: String
  let position: Int
  let total: Int
  let settings: WidgetSettings
  let frame: CGSize
  var readError: Int32? = nil

  // what: tapping a widget opens the album it is showing, so its source is never a guess
  var deepLink: URL? {
    guard let albumId else { return URL(string: "frame:///") }
    return URL(string: "frame:///album/\(albumId)")
  }
}

struct PhotoProvider: AppIntentTimelineProvider {
  // what: WidgetKit will not reload faster than roughly every 5 minutes
  private static let minimumIntervalMinutes = 5

  // what: chronod rejected a timeline archive at 10 MiB on the simulator; the device drew the line higher
  private static let archiveBudgetBytes = 6 * 1024 * 1024
  private static let maxEntries = 48
  private static let readRetrySeconds: TimeInterval = 15 * 60

  struct Plan {
    let entries: [PhotoEntry]
    let archiveBytes: Int
  }

  private static func frame(in context: Context) -> CGSize {
    let scale = (context.environmentVariants.displayScale ?? []).max() ?? 3
    return CGSize(
      width: (context.displaySize.width * scale).rounded(),
      height: (context.displaySize.height * scale).rounded())
  }

  /// Stable across processes, unlike `String.hashValue`, which Swift seeds randomly per
  /// launch — that made every relaunch of the extension reshuffle and jump the rotation.
  private static func stableSeed(_ text: String) -> UInt64 {
    var hash: UInt64 = 0xcbf2_9ce4_8422_2325
    for byte in text.utf8 {
      hash ^= UInt64(byte)
      hash = hash &* 0x100_0000_01b3
    }
    return hash | 1
  }

  /// Shuffle that is fixed within one pass through an album and different on the next,
  /// so a reload never hands the viewer a brand-new photo mid-pass.
  private static func shuffled(_ photos: [String], seed: String) -> [String] {
    var state = stableSeed(seed)
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
    PhotoEntry(
      date: Date(), fileName: nil, albumId: nil, albumName: "Frame", position: 0, total: 0,
      settings: FrameStore.settings(), frame: Self.frame(in: context))
  }

  func snapshot(for configuration: SelectAlbumIntent, in context: Context) async -> PhotoEntry {
    let startedAt =
      FrameStore.startedAt(key: Self.statusKey(family: context.family, configuration: configuration))
      ?? Date()
    return schedule(for: configuration, in: context, startedAt: startedAt, count: 1).first
      ?? placeholder(in: context)
  }

  func timeline(for configuration: SelectAlbumIntent, in context: Context) async -> Timeline<
    PhotoEntry
  > {
    let key = Self.statusKey(family: context.family, configuration: configuration)
    let startedAt = FrameStore.startedAt(key: key) ?? Date()
    let plan = plan(for: configuration, in: context, startedAt: startedAt)
    let built = plan.entries
    recordStatus(
      plan, configuration: configuration, family: context.family, key: key, startedAt: startedAt,
      placedKeys: await Self.placedKeys())
    if built.first?.readError != nil {
      return Timeline(
        entries: built, policy: .after(Date().addingTimeInterval(Self.readRetrySeconds)))
    }
    guard !built.isEmpty else {
      return Timeline(
        entries: [placeholder(in: context)], policy: .after(Date().addingTimeInterval(3600)))
    }
    return Timeline(entries: built, policy: .atEnd)
  }

  static func familyName(_ family: WidgetFamily) -> String {
    switch family {
    case .systemSmall: return "small"
    case .systemMedium: return "medium"
    case .systemLarge: return "large"
    case .systemExtraLarge: return "extraLarge"
    default: return "other"
    }
  }

  static func statusKey(family: WidgetFamily, configuration: SelectAlbumIntent) -> String {
    [
      familyName(family), configuration.albumId ?? "", configuration.groupId ?? "",
      "\(configuration.shuffle)",
    ].joined(separator: "|")
  }

  private static func placedKeys() async -> Set<String>? {
    guard let placed = try? await WidgetCenter.shared.currentConfigurations() else { return nil }
    return Set(
      placed.compactMap { info in
        info.widgetConfigurationIntent(of: SelectAlbumIntent.self).map {
          statusKey(family: info.family, configuration: $0)
        }
      })
  }

  private func recordStatus(
    _ plan: Plan, configuration: SelectAlbumIntent, family: WidgetFamily, key: String,
    startedAt: Date, placedKeys: Set<String>?
  ) {
    let built = plan.entries
    guard let first = built.first else { return }
    let name = Self.familyName(family)
    // what: the spacing actually used, so a change to the interval rule cannot desync the report
    let spacing =
      built.count > 1
      ? Int(built[1].date.timeIntervalSince(built[0].date) / 60)
      : max(Self.minimumIntervalMinutes, first.settings.refreshMinutes)
    FrameStore.recordStatus(
      [
        "family": name,
        "albumId": first.albumId ?? "",
        "albumName": first.albumName,
        "groupName": configuration.groupId == nil ? "" : configuration.group?.name ?? "",
        "shuffle": configuration.shuffle,
        "state": first.readError != nil
          ? "readError" : first.total == 0 ? (first.albumId == nil ? "noAlbum" : "noPhotos") : "ok",
        "sqliteCode": first.readError ?? 0,
        "photos": first.total,
        "entries": built.count,
        "frameWidth": Int(first.frame.width),
        "frameHeight": Int(first.frame.height),
        "archiveBytes": plan.archiveBytes,
        "intervalMinutes": spacing,
        "firstEntryAt": first.date.timeIntervalSince1970 * 1000,
        "startedAt": startedAt.timeIntervalSince1970 * 1000,
        "updatedAt": Date().timeIntervalSince1970 * 1000,
      ], key: key, placedKeys: placedKeys)
  }

  private func plan(
    for configuration: SelectAlbumIntent, in context: Context, startedAt: Date
  ) -> Plan {
    let candidates = schedule(
      for: configuration, in: context, startedAt: startedAt, count: Self.maxEntries)
    guard let first = candidates.first, first.fileName != nil else {
      return Plan(entries: candidates, archiveBytes: 0)
    }
    return Self.fitToBudget(
      candidates, frame: first.frame, fit: first.settings.contentMode == .fit)
  }

  private func schedule(
    for configuration: SelectAlbumIntent, in context: Context, startedAt: Date, count wanted: Int
  ) -> [PhotoEntry] {
    let settings = FrameStore.settings()
    let frame = Self.frame(in: context)
    let resolved = FrameStore.resolve(albumId: configuration.albumId, groupId: configuration.groupId)
    guard case .success(let found) = resolved, let album = found, !album.photos.isEmpty else {
      var readError: Int32?
      if case .failure(let error) = resolved { readError = error.code }
      return [
        PhotoEntry(
          date: Date(), fileName: nil, albumId: configuration.albumId,
          albumName: configuration.albumId == nil ? "Frame" : configuration.album?.name ?? "Frame",
          position: 0, total: 0, settings: settings, frame: frame, readError: readError)
      ]
    }

    let minutes = max(Self.minimumIntervalMinutes, settings.refreshMinutes)
    let interval = TimeInterval(minutes * 60)
    let now = Date()
    let offset = TimeInterval(TimeZone.current.secondsFromGMT(for: now))
    let slot = ((now.timeIntervalSince1970 + offset) / interval).rounded(.down)
    let slotStart = Date(timeIntervalSince1970: slot * interval - offset)
    // what: counting slots from when this widget started keeps a reload from restarting the rotation
    let startSlot = ((startedAt.timeIntervalSince1970 + offset) / interval).rounded(.down)

    let useShuffle = configuration.shuffle
    let total = album.photos.count
    let firstSlot = max(0, Int(slot - startSlot))
    var orders: [Int: [String]] = [:]
    var built: [PhotoEntry] = []
    built.reserveCapacity(wanted)

    for index in 0..<wanted {
      let absolute = firstSlot + index
      let cycle = Int(floor(Double(absolute) / Double(total)))
      let position = ((absolute % total) + total) % total
      let ordered: [String]
      if let cached = orders[cycle] {
        ordered = cached
      } else {
        ordered = useShuffle ? Self.shuffled(album.photos, seed: "\(album.id)#\(cycle)") : album.photos
        orders[cycle] = ordered
      }
      built.append(
        PhotoEntry(
          date: slotStart.addingTimeInterval(TimeInterval(index) * interval),
          fileName: ordered[position],
          albumId: album.id,
          albumName: album.name,
          position: position,
          total: total,
          settings: settings,
          frame: frame))
    }
    return built
  }

  private static func fitToBudget(_ candidates: [PhotoEntry], frame: CGSize, fit: Bool) -> Plan {
    var measured: [String: Int] = [:]
    var total = 0
    var kept: [PhotoEntry] = []
    for entry in candidates {
      guard let name = entry.fileName else { continue }
      let bytes =
        measured[name] ?? (PhotoLoader.jpeg(fileName: name, frame: frame, fit: fit)?.count ?? 0)
      measured[name] = bytes
      if !kept.isEmpty, total + bytes > archiveBudgetBytes { break }
      total += bytes
      kept.append(entry)
    }
    return Plan(entries: kept, archiveBytes: total)
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
      .containerBackground(for: .widget) { Color(white: 0.07) }
      .widgetURL(entry.deepLink)
  }

  // what: one decode reused for both layers, so `fit` costs no extra memory
  @ViewBuilder private var photo: some View {
    if let image = PhotoLoader.image(
      fileName: entry.fileName, frame: entry.frame, fit: entry.settings.contentMode == .fit)
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
    }
  }

  @ViewBuilder private var content: some View {
    if entry.readError != nil {
      Color.clear
    } else if entry.fileName == nil {
      EmptyFrameView()
    } else {
      ZStack {
        Color.clear
        photo
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .clipped()
        caption
      }
    }
  }

  @ViewBuilder private var caption: some View {
    if overlayText {
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
