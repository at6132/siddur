//
//  OmerWidget.swift
//  Siddur Widgets
//
//  Omer counting widget (seasonal)
//

import WidgetKit
import SwiftUI

struct OmerWidget: Widget {
    let kind: String = "OmerWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: OmerWidgetProvider()) { entry in
            OmerWidgetView(entry: entry)
        }
        .configurationDisplayName("Sefiras HaOmer")
        .description("Today's Omer count")
        .supportedFamilies([.systemSmall])
    }
}

struct OmerWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> OmerWidgetEntry {
        OmerWidgetEntry(
            date: Date(),
            omerDay: 15,
            omerCounted: true
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (OmerWidgetEntry) -> Void) {
        let entry = OmerWidgetEntry(
            date: Date(),
            omerDay: 15,
            omerCounted: true
        )
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<OmerWidgetEntry>) -> Void) {
        let data = WidgetDataProvider.shared.getWidgetData()
        let entry = OmerWidgetEntry(
            date: Date(),
            omerDay: data?.omerDay,
            omerCounted: data?.omerCounted ?? false
        )
        
        // Refresh daily
        let nextUpdate = Calendar.current.startOfDay(for: Calendar.current.date(byAdding: .day, value: 1, to: Date())!)
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

struct OmerWidgetEntry: TimelineEntry {
    let date: Date
    let omerDay: Int?
    let omerCounted: Bool
}

struct OmerWidgetView: View {
    var entry: OmerWidgetProvider.Entry
    
    var body: some View {
        ZStack {
            // Liquid Glass background
            LinearGradient(
                colors: [
                    Color.white.opacity(0.8),
                    Color.white.opacity(0.6)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .blur(radius: 20)
            
            VStack(spacing: 12) {
                if let day = entry.omerDay {
                    Text("Day \(day)")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(.primary)
                    
                    Text("of the Omer")
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                    
                    if entry.omerCounted {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                            .font(.system(size: 24))
                    }
                } else {
                    Text("Not in Omer period")
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                }
            }
            .padding()
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

#Preview {
    OmerWidgetView(entry: OmerWidgetEntry(
        date: Date(),
        omerDay: 15,
        omerCounted: true
    ))
    .previewContext(WidgetPreviewContext(family: .systemSmall))
}
