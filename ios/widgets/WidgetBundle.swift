//
//  WidgetBundle.swift
//  Siddur Widgets
//
//  Widget bundle containing all widgets
//

import WidgetKit
import SwiftUI

@main
struct SiddurWidgetBundle: WidgetBundle {
    var body: some Widget {
        TodayWidget()
        OmerWidget()
    }
}
