// Copyright 2026 Syrena Mobile. All rights reserved.
// Main App View - Modern Liquid Glass Tab Bar Implementation

import SwiftUI

/// Main app view with modern Liquid Glass tab bar
struct SyrenaMainAppView: View {
    @State private var selectedTab: AppTab = .home
    @Namespace private var namespace
    
    var body: some View {
        ZStack(alignment: .bottom) {
            // Main Content
            TabView(selection: $selectedTab) {
                ForEach(AppTab.allCases) { tab in
                    tab.destination
                        .tag(tab)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            
            // Custom Glass Tab Bar
            customTabBar
                .padding(.horizontal, SyrenaDesign.Spacing.lg)
                .padding(.bottom, SyrenaDesign.Spacing.md)
        }
        .ignoresSafeArea(.keyboard)
    }
    
    // MARK: - Custom Tab Bar
    
    private var customTabBar: some View {
        GlassEffectContainer(spacing: 0) {
            HStack(spacing: 0) {
                ForEach(AppTab.allCases) { tab in
                    tabButton(for: tab)
                        .glassEffectUnion(
                            id: "tab-\(tab.rawValue)",
                            namespace: namespace
                        )
                }
            }
            .padding(.horizontal, SyrenaDesign.Spacing.xs)
            .padding(.vertical, SyrenaDesign.Spacing.xs)
        }
        .glassEffect(
            .regular.tint(SyrenaDesign.Colors.glassTintBlue).interactive(),
            in: .capsule
        )
        .modernElevation(.floating)
    }
    
    private func tabButton(for tab: AppTab) -> some View {
        Button {
            withAnimation(SyrenaDesign.Animation.springBouncy) {
                selectedTab = tab
            }
            
            // Haptic feedback
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
        } label: {
            VStack(spacing: SyrenaDesign.Spacing.xxs) {
                Image(systemName: selectedTab == tab ? tab.selectedIcon : tab.icon)
                    .font(.system(size: 22))
                    .foregroundStyle(
                        selectedTab == tab
                            ? SyrenaDesign.Colors.accent
                            : SyrenaDesign.Colors.secondaryLabel
                    )
                    .symbolEffect(.bounce, value: selectedTab == tab)
                    .frame(height: 28)
                
                if selectedTab == tab {
                    Text(tab.title)
                        .font(SyrenaDesign.Typography.caption2.weight(.semibold))
                        .foregroundStyle(SyrenaDesign.Colors.accent)
                        .transition(.scale.combined(with: .opacity))
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, SyrenaDesign.Spacing.sm)
            .background {
                if selectedTab == tab {
                    Capsule()
                        .fill(SyrenaDesign.Colors.accent.opacity(0.15))
                        .matchedGeometryEffect(id: "selectedTab", in: namespace)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - App Tabs

enum AppTab: String, CaseIterable, Identifiable {
    case home
    case search
    case create
    case notifications
    case profile
    
    var id: String { rawValue }
    
    var title: String {
        switch self {
        case .home: return "Home"
        case .search: return "Search"
        case .create: return "Create"
        case .notifications: return "Alerts"
        case .profile: return "Profile"
        }
    }
    
    var icon: String {
        switch self {
        case .home: return "house"
        case .search: return "magnifyingglass"
        case .create: return "plus.circle"
        case .notifications: return "bell"
        case .profile: return "person"
        }
    }
    
    var selectedIcon: String {
        switch self {
        case .home: return "house.fill"
        case .search: return "magnifyingglass"
        case .create: return "plus.circle.fill"
        case .notifications: return "bell.fill"
        case .profile: return "person.fill"
        }
    }
    
    @ViewBuilder
    var destination: some View {
        switch self {
        case .home:
            HomeView()
        case .search:
            SearchView()
        case .create:
            CreateView()
        case .notifications:
            NotificationsView()
        case .profile:
            ProfileView()
        }
    }
}

// MARK: - Home View

struct HomeView: View {
    @State private var posts: [FeedPost] = FeedPost.examples
    
    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: SyrenaDesign.Spacing.lg) {
                    ForEach(posts) { post in
                        FeedPostCard(post: post)
                            .syrenaScrollTransition()
                    }
                }
                .padding(SyrenaDesign.Spacing.lg)
                .padding(.bottom, 100) // Space for tab bar
            }
            .background(SyrenaDesign.Colors.background)
            .navigationTitle("Home")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

// MARK: - Feed Post Card

struct FeedPostCard: View {
    let post: FeedPost
    @State private var isLiked = false
    @State private var isBookmarked = false
    
    var body: some View {
        GlassCard(
            cornerRadius: SyrenaDesign.CornerRadius.xl,
            tintColor: SyrenaDesign.Colors.glassTintLight,
            isInteractive: true
        ) {
            VStack(alignment: .leading, spacing: SyrenaDesign.Spacing.md) {
                // Header
                HStack(spacing: SyrenaDesign.Spacing.sm) {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [
                                    SyrenaDesign.Colors.accent,
                                    SyrenaDesign.Colors.accent.opacity(0.6)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 40, height: 40)
                        .overlay {
                            Image(systemName: "person.fill")
                                .foregroundStyle(.white)
                        }
                        .glassEffect(in: .circle)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 4) {
                            Text(post.author)
                                .font(SyrenaDesign.Typography.callout.weight(.semibold))
                                .foregroundStyle(SyrenaDesign.Colors.label)
                            
                            if post.isVerified {
                                Image(systemName: "checkmark.seal.fill")
                                    .font(.caption2)
                                    .foregroundStyle(.blue)
                            }
                        }
                        
                        Text(post.timeAgo)
                            .font(SyrenaDesign.Typography.caption)
                            .foregroundStyle(SyrenaDesign.Colors.secondaryLabel)
                    }
                    
                    Spacer()
                    
                    Button {
                        print("More options")
                    } label: {
                        Image(systemName: "ellipsis")
                            .foregroundStyle(SyrenaDesign.Colors.secondaryLabel)
                    }
                    .buttonStyle(.syrenaGlass(size: .small, variant: .secondary))
                }
                
                // Content
                Text(post.content)
                    .font(SyrenaDesign.Typography.body)
                    .foregroundStyle(SyrenaDesign.Colors.label)
                    .lineLimit(nil)
                
                // Image (if present)
                if post.hasImage {
                    RoundedRectangle(cornerRadius: SyrenaDesign.CornerRadius.md)
                        .fill(
                            LinearGradient(
                                colors: [
                                    SyrenaDesign.Colors.accent.opacity(0.3),
                                    SyrenaDesign.Colors.accent.opacity(0.1)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .aspectRatio(16/9, contentMode: .fit)
                        .overlay {
                            Image(systemName: "photo")
                                .font(.system(size: 40))
                                .foregroundStyle(SyrenaDesign.Colors.tertiaryLabel)
                        }
                        .glassEffect(in: .rect(cornerRadius: SyrenaDesign.CornerRadius.md))
                }
                
                // Engagement Bar
                HStack(spacing: SyrenaDesign.Spacing.lg) {
                    engagementButton(
                        icon: isLiked ? "heart.fill" : "heart",
                        count: post.likes + (isLiked ? 1 : 0),
                        color: isLiked ? .red : SyrenaDesign.Colors.secondaryLabel,
                        action: {
                            withAnimation(SyrenaDesign.Animation.springBouncy) {
                                isLiked.toggle()
                            }
                            
                            let generator = UIImpactFeedbackGenerator(style: .light)
                            generator.impactOccurred()
                        }
                    )
                    
                    engagementButton(
                        icon: "bubble.right",
                        count: post.comments,
                        color: SyrenaDesign.Colors.secondaryLabel,
                        action: { print("Comments") }
                    )
                    
                    engagementButton(
                        icon: "arrow.2.squarepath",
                        count: post.shares,
                        color: SyrenaDesign.Colors.secondaryLabel,
                        action: { print("Share") }
                    )
                    
                    Spacer()
                    
                    Button {
                        withAnimation(SyrenaDesign.Animation.springBouncy) {
                            isBookmarked.toggle()
                        }
                        
                        let generator = UIImpactFeedbackGenerator(style: .light)
                        generator.impactOccurred()
                    } label: {
                        Image(systemName: isBookmarked ? "bookmark.fill" : "bookmark")
                            .foregroundStyle(
                                isBookmarked
                                    ? SyrenaDesign.Colors.accent
                                    : SyrenaDesign.Colors.secondaryLabel
                            )
                            .symbolEffect(.bounce, value: isBookmarked)
                    }
                }
                .font(SyrenaDesign.Typography.callout)
            }
            .padding(SyrenaDesign.Spacing.lg)
        }
    }
    
    private func engagementButton(
        icon: String,
        count: Int,
        color: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .foregroundStyle(color)
                    .symbolEffect(.bounce, value: count)
                Text("\(count)")
                    .foregroundStyle(SyrenaDesign.Colors.secondaryLabel)
            }
            .font(SyrenaDesign.Typography.callout)
        }
    }
}

// MARK: - Other Tab Views (Placeholders)

struct SearchView: View {
    var body: some View {
        NavigationStack {
            SyrenaEmptyStateView(
                icon: "magnifyingglass",
                title: "Search",
                message: "Search for users, posts, and topics"
            )
            .navigationTitle("Search")
        }
    }
}

struct CreateView: View {
    var body: some View {
        NavigationStack {
            SyrenaEmptyStateView(
                icon: "plus.circle.fill",
                title: "Create",
                message: "Share your thoughts with the world",
                actionTitle: "Create Post",
                action: { print("Create post") }
            )
            .navigationTitle("Create")
        }
    }
}

struct NotificationsView: View {
    var body: some View {
        NavigationStack {
            SyrenaEmptyStateView(
                icon: "bell.fill",
                title: "No Notifications",
                message: "You're all caught up!"
            )
            .navigationTitle("Notifications")
        }
    }
}

// MARK: - Data Models

struct FeedPost: Identifiable {
    let id: String
    let author: String
    let isVerified: Bool
    let timeAgo: String
    let content: String
    let hasImage: Bool
    let likes: Int
    let comments: Int
    let shares: Int
    
    static let examples: [FeedPost] = [
        FeedPost(
            id: "1",
            author: "Sarah Chen",
            isVerified: true,
            timeAgo: "2h ago",
            content: "Just discovered Liquid Glass design in SwiftUI and I'm absolutely blown away! The way it reacts to interactions is magical ✨",
            hasImage: true,
            likes: 234,
            comments: 45,
            shares: 12
        ),
        FeedPost(
            id: "2",
            author: "Michael Rodriguez",
            isVerified: false,
            timeAgo: "5h ago",
            content: "Morning coffee and code session 💻☕️ Working on some exciting new features for the app!",
            hasImage: false,
            likes: 89,
            comments: 23,
            shares: 5
        ),
        FeedPost(
            id: "3",
            author: "Emma Thompson",
            isVerified: true,
            timeAgo: "1d ago",
            content: "The new iOS design patterns are really pushing the boundaries of what's possible in mobile UI. Can't wait to implement these in my projects!",
            hasImage: true,
            likes: 567,
            comments: 89,
            shares: 34
        )
    ]
}

// MARK: - Preview

#if DEBUG
struct SyrenaMainAppView_Previews: PreviewProvider {
    static var previews: some View {
        SyrenaMainAppView()
    }
}
#endif
