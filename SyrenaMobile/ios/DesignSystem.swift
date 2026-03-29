// Copyright 2026 Syrena Mobile. All rights reserved.
// Design System - Modern iOS Design Implementation

import SwiftUI

// MARK: - Syrena Design System

/// Central design system for Syrena mobile application
/// Implements modern iOS design patterns including Liquid Glass, adaptive colors, and elevation
struct SyrenaDesign {
    static let shared = SyrenaDesign()
    private init() {}
}

// MARK: - Color System

extension SyrenaDesign {
    /// Adaptive color palette that works in light and dark mode
    struct Colors {
        // Primary Brand Colors
        static let primary = Color("SyrenaPrimary", bundle: nil)
        static let secondary = Color("SyrenaSecondary", bundle: nil)
        static let accent = Color("SyrenaAccent", bundle: nil)
        
        // Semantic Colors
        static let background = Color(.systemBackground)
        static let secondaryBackground = Color(.secondarySystemBackground)
        static let tertiaryBackground = Color(.tertiarySystemBackground)
        
        static let label = Color(.label)
        static let secondaryLabel = Color(.secondaryLabel)
        static let tertiaryLabel = Color(.tertiaryLabel)
        
        // Glass Tint Colors
        static let glassTintLight = Color.white.opacity(0.1)
        static let glassTintDark = Color.black.opacity(0.15)
        static let glassTintBlue = Color.blue.opacity(0.2)
        static let glassTintPurple = Color.purple.opacity(0.2)
        static let glassTintPink = Color.pink.opacity(0.2)
        
        // Status Colors
        static let success = Color.green
        static let warning = Color.orange
        static let error = Color.red
        static let info = Color.blue
        
        // Adaptive Glass Tint
        static var adaptiveGlassTint: Color {
            Color(.systemBackground).opacity(0.1)
        }
    }
}

// MARK: - Typography System

extension SyrenaDesign {
    /// Modern typography scale with rounded design for personality
    struct Typography {
        // Display Fonts (for major headings)
        static let largeTitle = Font.system(size: 34, weight: .bold, design: .rounded)
        
        // Title Fonts
        static let title1 = Font.system(size: 28, weight: .semibold, design: .rounded)
        static let title2 = Font.system(size: 22, weight: .semibold, design: .rounded)
        static let title3 = Font.system(size: 20, weight: .medium, design: .rounded)
        
        // Body Fonts
        static let body = Font.system(size: 17, weight: .regular, design: .default)
        static let bodyBold = Font.system(size: 17, weight: .semibold, design: .default)
        
        // Supporting Fonts
        static let callout = Font.system(size: 16, weight: .regular, design: .default)
        static let subheadline = Font.system(size: 15, weight: .regular, design: .default)
        static let footnote = Font.system(size: 13, weight: .regular, design: .default)
        static let caption = Font.system(size: 12, weight: .regular, design: .default)
        static let caption2 = Font.system(size: 11, weight: .regular, design: .default)
    }
}

// MARK: - Spacing System

extension SyrenaDesign {
    /// Consistent spacing scale (based on 4pt grid)
    struct Spacing {
        static let xxxs: CGFloat = 2
        static let xxs: CGFloat = 4
        static let xs: CGFloat = 8
        static let sm: CGFloat = 12
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
        static let xxxl: CGFloat = 64
    }
}

// MARK: - Corner Radius System

extension SyrenaDesign {
    /// Consistent corner radius scale
    struct CornerRadius {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 20
        static let xxl: CGFloat = 24
        static let xxxl: CGFloat = 28
        static let full: CGFloat = 9999 // Capsule
    }
}

// MARK: - Elevation System

extension SyrenaDesign {
    /// Modern elevation/shadow system for depth
    enum ElevationLevel {
        case flat
        case low
        case medium
        case high
        case floating
        
        var shadowRadius: CGFloat {
            switch self {
            case .flat: return 0
            case .low: return 4
            case .medium: return 8
            case .high: return 16
            case .floating: return 24
            }
        }
        
        var shadowY: CGFloat {
            switch self {
            case .flat: return 0
            case .low: return 2
            case .medium: return 4
            case .high: return 8
            case .floating: return 12
            }
        }
        
        var shadowOpacity: Double {
            switch self {
            case .flat: return 0
            case .low: return 0.08
            case .medium: return 0.12
            case .high: return 0.16
            case .floating: return 0.20
            }
        }
        
        var cornerRadius: CGFloat {
            return SyrenaDesign.CornerRadius.lg
        }
    }
}

// MARK: - Animation System

extension SyrenaDesign {
    /// Consistent animation timings and curves
    struct Animation {
        // Duration
        static let instant: Double = 0.1
        static let fast: Double = 0.2
        static let normal: Double = 0.3
        static let slow: Double = 0.5
        static let verySlow: Double = 0.8
        
        // Spring Animations
        static let springBouncy = SwiftUI.Animation.spring(response: 0.3, dampingFraction: 0.6)
        static let springNormal = SwiftUI.Animation.spring(response: 0.4, dampingFraction: 0.7)
        static let springSmooth = SwiftUI.Animation.spring(response: 0.5, dampingFraction: 0.8)
        static let springSoft = SwiftUI.Animation.spring(response: 0.6, dampingFraction: 0.9)
        
        // Standard Animations
        static let easeInOut = SwiftUI.Animation.easeInOut(duration: normal)
        static let easeOut = SwiftUI.Animation.easeOut(duration: normal)
        static let easeIn = SwiftUI.Animation.easeIn(duration: normal)
        static let linear = SwiftUI.Animation.linear(duration: normal)
    }
}

// MARK: - View Extensions

extension View {
    /// Apply modern elevation to any view
    func modernElevation(_ level: SyrenaDesign.ElevationLevel) -> some View {
        self
            .shadow(
                color: Color.black.opacity(level.shadowOpacity),
                radius: level.shadowRadius,
                x: 0,
                y: level.shadowY
            )
            .overlay(
                RoundedRectangle(cornerRadius: level.cornerRadius)
                    .stroke(Color.white.opacity(0.05), lineWidth: 0.5)
            )
    }
    
    /// Apply Syrena-branded corner radius
    func syrenaCornerRadius(_ radius: CGFloat = SyrenaDesign.CornerRadius.lg) -> some View {
        self.clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
    }
    
    /// Apply Syrena spacing
    func syrenaPadding(_ edges: Edge.Set = .all, _ size: CGFloat = SyrenaDesign.Spacing.md) -> some View {
        self.padding(edges, size)
    }
}

// MARK: - Liquid Glass Components

/// Glass card with modern design
struct GlassCard<Content: View>: View {
    let content: Content
    let cornerRadius: CGFloat
    let tintColor: Color?
    let isInteractive: Bool
    
    init(
        cornerRadius: CGFloat = SyrenaDesign.CornerRadius.xl,
        tintColor: Color? = nil,
        isInteractive: Bool = true,
        @ViewBuilder content: () -> Content
    ) {
        self.content = content()
        self.cornerRadius = cornerRadius
        self.tintColor = tintColor
        self.isInteractive = isInteractive
    }
    
    var body: some View {
        content
            .glassEffect(
                glassConfiguration,
                in: .rect(cornerRadius: cornerRadius)
            )
    }
    
    private var glassConfiguration: Glass {
        var glass = Glass.regular
        if let tint = tintColor {
            glass = glass.tint(tint)
        }
        if isInteractive {
            glass = glass.interactive()
        }
        return glass
    }
}

/// Glass button style
struct SyrenaGlassButtonStyle: ButtonStyle {
    let size: ButtonSize
    let variant: ButtonVariant
    
    enum ButtonSize {
        case small, medium, large
        
        var padding: EdgeInsets {
            switch self {
            case .small: return EdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12)
            case .medium: return EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16)
            case .large: return EdgeInsets(top: 16, leading: 24, bottom: 16, trailing: 24)
            }
        }
        
        var font: Font {
            switch self {
            case .small: return SyrenaDesign.Typography.footnote
            case .medium: return SyrenaDesign.Typography.body
            case .large: return SyrenaDesign.Typography.bodyBold
            }
        }
    }
    
    enum ButtonVariant {
        case primary, secondary, destructive, plain
        
        var tintColor: Color? {
            switch self {
            case .primary: return SyrenaDesign.Colors.glassTintBlue
            case .secondary: return SyrenaDesign.Colors.glassTintLight
            case .destructive: return Color.red.opacity(0.2)
            case .plain: return nil
            }
        }
    }
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(size.font)
            .padding(size.padding)
            .glassEffect(
                glassConfig(isPressed: configuration.isPressed),
                in: .rect(cornerRadius: SyrenaDesign.CornerRadius.lg)
            )
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(SyrenaDesign.Animation.springBouncy, value: configuration.isPressed)
    }
    
    private func glassConfig(isPressed: Bool) -> Glass {
        var glass = Glass.regular.interactive()
        if let tint = variant.tintColor {
            glass = glass.tint(isPressed ? tint.opacity(1.5) : tint)
        }
        return glass
    }
}

// MARK: - Button Style Extensions

extension ButtonStyle where Self == SyrenaGlassButtonStyle {
    static var syrenaGlass: SyrenaGlassButtonStyle {
        SyrenaGlassButtonStyle(size: .medium, variant: .primary)
    }
    
    static func syrenaGlass(size: SyrenaGlassButtonStyle.ButtonSize, variant: SyrenaGlassButtonStyle.ButtonVariant = .primary) -> SyrenaGlassButtonStyle {
        SyrenaGlassButtonStyle(size: size, variant: variant)
    }
}

// MARK: - Scroll Transition Effects

extension View {
    /// Apply modern scroll transition effects
    func syrenaScrollTransition() -> some View {
        self.scrollTransition { content, phase in
            content
                .opacity(phase.isIdentity ? 1.0 : 0.6)
                .scaleEffect(phase.isIdentity ? 1.0 : 0.95)
                .offset(y: phase.isIdentity ? 0 : 10)
        }
    }
}

// MARK: - Loading States

/// Skeleton loading view with glass shimmer
struct SyrenaSkeletonView: View {
    @State private var isAnimating = false
    
    let height: CGFloat
    let cornerRadius: CGFloat
    
    init(height: CGFloat = 100, cornerRadius: CGFloat = SyrenaDesign.CornerRadius.md) {
        self.height = height
        self.cornerRadius = cornerRadius
    }
    
    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius)
            .fill(
                LinearGradient(
                    colors: [
                        SyrenaDesign.Colors.secondaryBackground,
                        SyrenaDesign.Colors.secondaryBackground.opacity(0.5),
                        SyrenaDesign.Colors.secondaryBackground
                    ],
                    startPoint: isAnimating ? .leading : .trailing,
                    endPoint: isAnimating ? .trailing : .leading
                )
            )
            .frame(height: height)
            .glassEffect(in: .rect(cornerRadius: cornerRadius))
            .onAppear {
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    isAnimating.toggle()
                }
            }
    }
}

// MARK: - Empty States

/// Modern empty state view with glass design
struct SyrenaEmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    let actionTitle: String?
    let action: (() -> Void)?
    
    @State private var isAnimating = false
    
    init(
        icon: String,
        title: String,
        message: String,
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.icon = icon
        self.title = title
        self.message = message
        self.actionTitle = actionTitle
        self.action = action
    }
    
    var body: some View {
        VStack(spacing: SyrenaDesign.Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: 64))
                .foregroundStyle(SyrenaDesign.Colors.secondaryLabel)
                .symbolEffect(.bounce, value: isAnimating)
            
            VStack(spacing: SyrenaDesign.Spacing.xs) {
                Text(title)
                    .font(SyrenaDesign.Typography.title2)
                    .foregroundStyle(SyrenaDesign.Colors.label)
                
                Text(message)
                    .font(SyrenaDesign.Typography.callout)
                    .foregroundStyle(SyrenaDesign.Colors.secondaryLabel)
                    .multilineTextAlignment(.center)
            }
            
            if let actionTitle = actionTitle, let action = action {
                Button(action: action) {
                    Text(actionTitle)
                        .fontWeight(.semibold)
                }
                .buttonStyle(.syrenaGlass(size: .medium, variant: .primary))
            }
        }
        .padding(SyrenaDesign.Spacing.xxl)
        .glassEffect(.regular, in: .rect(cornerRadius: SyrenaDesign.CornerRadius.xl))
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                isAnimating = true
            }
        }
    }
}

// MARK: - Preview Helpers

#if DEBUG
struct DesignSystem_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: SyrenaDesign.Spacing.lg) {
            // Glass Card Example
            GlassCard(tintColor: SyrenaDesign.Colors.glassTintBlue) {
                VStack(alignment: .leading, spacing: SyrenaDesign.Spacing.sm) {
                    Text("Glass Card")
                        .font(SyrenaDesign.Typography.title2)
                    Text("Modern Liquid Glass design")
                        .font(SyrenaDesign.Typography.callout)
                        .foregroundStyle(SyrenaDesign.Colors.secondaryLabel)
                }
                .padding(SyrenaDesign.Spacing.lg)
            }
            
            // Button Examples
            HStack(spacing: SyrenaDesign.Spacing.md) {
                Button("Primary") {}
                    .buttonStyle(.syrenaGlass(size: .medium, variant: .primary))
                
                Button("Secondary") {}
                    .buttonStyle(.syrenaGlass(size: .medium, variant: .secondary))
            }
            
            // Empty State Example
            SyrenaEmptyStateView(
                icon: "tray",
                title: "No Items",
                message: "Get started by adding your first item",
                actionTitle: "Add Item",
                action: {}
            )
        }
        .padding()
        .background(SyrenaDesign.Colors.background)
    }
}
#endif
