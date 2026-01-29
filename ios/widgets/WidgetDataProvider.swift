//
//  WidgetDataProvider.swift
//  Siddur Widgets
//
//  Data provider for iOS widgets
//

import Foundation
import WidgetKit

struct WidgetData: Codable {
    let jewishDate: String
    let jewishDateShort: String
    let spiritualCue: String?
    let minchaTime: String?
    let isShabbos: Bool
    let omerDay: Int?
    let omerCounted: Bool
    let hasHabitMark: Bool
}

class WidgetDataProvider {
    static let shared = WidgetDataProvider()
    private let appGroupIdentifier = "group.com.siddur.app"
    
    private init() {}
    
    func getWidgetData() -> WidgetData? {
        guard let sharedDefaults = UserDefaults(suiteName: appGroupIdentifier),
              let dataString = sharedDefaults.string(forKey: "widget_data"),
              let data = dataString.data(using: .utf8),
              let widgetData = try? JSONDecoder().decode(WidgetData.self, from: data) else {
            return nil
        }
        return widgetData
    }
    
    func refreshWidgets() {
        WidgetCenter.shared.reloadAllTimelines()
    }
}
