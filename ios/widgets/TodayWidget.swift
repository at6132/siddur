//
//  TodayWidget.swift
//  Siddur Widgets
//
//  Today widget showing Jewish date and spiritual cue
//

import WidgetKit
import SwiftUI

struct TodayWidget: Widget {
    let kind: String = "TodayWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayWidgetProvider()) { entry in
            TodayWidgetView(entry: entry)
        }
        .configurationDisplayName("Today")
        .description("Jewish date and spiritual cue for today")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct TodayWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayWidgetEntry {
        TodayWidgetEntry(
            date: Date(),
            jewishDate: "15 Nisan 5784",
            jewishDateShort: "15 Nisan",
            spiritualCue: "A moment for Tehillim",
            isShabbos: false
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (TodayWidgetEntry) -> Void) {
        let entry = TodayWidgetEntry(
            date: Date(),
            jewishDate: "15 Nisan 5784",
            jewishDateShort: "15 Nisan",
            spiritualCue: "A moment for Tehillim",
            isShabbos: false
        )
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayWidgetEntry>) -> Void) {
        let data = WidgetDataProvider.shared.getWidgetData()
        let entry = TodayWidgetEntry(
            date: Date(),
            jewishDate: data?.jewishDate ?? "Loading...",
            jewishDateShort: data?.jewishDateShort ?? "Loading...",
            spiritualCue: data?.spiritualCue,
            isShabbos: data?.isShabbos ?? false
        )
        
        // Refresh every hour
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

struct TodayWidgetEntry: TimelineEntry {
    let date: Date
    let jewishDate: String
    let jewishDateShort: String
    let spiritualCue: String?
    let isShabbos: Bool
}

struct TodayWidgetView: View {
    var entry: TodayWidgetProvider.Entry
    
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
            
            VStack(alignment: .leading, spacing: 8) {
                Text(entry.jewishDateShort)
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundColor(.primary)
                
                if let cue = entry.spiritualCue {
                    Text(cue)
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                if entry.isShabbos {
                    Text("Shabbos Shalom ✨")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.purple)
                        .padding(.top, 4)
                }
            }
            .padding()
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

#Preview {
    TodayWidgetView(entry: TodayWidgetEntry(
        date: Date(),
        jewishDate: "15 Nisan 5784",
        jewishDateShort: "15 Nisan",
        spiritualCue: "A moment for Tehillim",
        isShabbos: false
    ))
    .previewContext(WidgetPreviewContext(family: .systemSmall))
}
