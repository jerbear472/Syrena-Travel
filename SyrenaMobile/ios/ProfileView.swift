// Copyright 2026 Syrena Mobile. All rights reserved.
// Profile View - Modern Liquid Glass Implementation

import SwiftUI

/// Modern profile view with Liquid Glass design and animations
struct ProfileView: View {
    @State private var profileData: ProfileData
    @State private var showBioEditor = false
    @State private var showSettings = false
    @State private var isFollowing = false
    @State private var showShareSheet = false
    
    @Namespace private var namespace
    
    init(profileData: ProfileData = .example) {
        _profileData = State(initialValue: profileData)
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: SyrenaDesign.Spacing.lg) {
                    // Profile Header Card
                    profileHeaderCard
                    
                    // Stats Card
                    statsCard
                    
                    // Bio Card
                    bioCard
                    
                    // Action Buttons
                    actionButtons
                    
                    // Content Grid (Posts, etc.)
                    contentSection
                }
                .padding(SyrenaDesign.Spacing.lg)
            }
            .background(SyrenaDesign.Colors.background)
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape.fill")
                    }
                    .buttonStyle(.syrenaGlass(size: .small, variant: .secondary))
                }
            }
            .sheet(isPresented: $showBioEditor) {
                ProfileBioEditorView(initialBio: profileData.bio) { newBio in
                    profileData.bio = newBio
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
        }
    }
    
    // MARK: - Profile Header Card
    
    private var profileHeaderCard: some View {
        GlassCard(
            cornerRadius: SyrenaDesign.CornerRadius.xxl,
            tintColor: SyrenaDesign.Colors.glassTintBlue,
            isInteractive: true
        ) {
            VStack(spacing: SyrenaDesign.Spacing.md) {
                // Profile Image
                profileImage
                
                // Name and Username
                VStack(spacing: SyrenaDesign.Spacing.xxs) {
                    Text(profileData.name)
                        .font(SyrenaDesign.Typography.title1)
                        .foregroundStyle(SyrenaDesign.Colors.label)
                    
                    Text("@\(profileData.username)")
                        .font(SyrenaDesign.Typography.callout)
                        .foregroundStyle(SyrenaDesign.Colors.secondaryLabel)
                }
                
                // Verification Badge
                if profileData.isVerified {
                    HStack(spacing: SyrenaDesign.Spacing.xxs) {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.caption)
                            .foregroundStyle(.blue)
                            .symbolEffect(.bounce)
                        Text("Verified")
                            .font(SyrenaDesign.Typography.caption)
                            .foregroundStyle(SyrenaDesign.Colors.secondaryLabel)
                    }
                    .padding(.horizontal, SyrenaDesign.Spacing.sm)
                    .padding(.vertical, SyrenaDesign.Spacing.xxs)
                    .glassEffect(.regular.tint(.blue.opacity(0.1)), in: .capsule)
                }
            }
            .padding(SyrenaDesign.Spacing.xl)
        }
        .matchedGeometryEffect(id: "profileCard", in: namespace)
    }
    
    private var profileImage: some View {
        ZStack {
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
                .frame(width: 120, height: 120)
            
            Image(systemName: "person.fill")
                .font(.system(size: 50))
                .foregroundStyle(.white)
        }
        .glassEffect(.regular.interactive(), in: .circle)
        .modernElevation(.medium)
    }
    
    // MARK: - Stats Card
    
    private var statsCard: some View {
        GlassCard(
            cornerRadius: SyrenaDesign.CornerRadius.lg,
            tintColor: SyrenaDesign.Colors.glassTintPurple,
            isInteractive: false
        ) {
            HStack(spacing: 0) {
                statItem(value: profileData.postsCount, label: "Posts")
                Divider().frame(height: 40)
                statItem(value: profileData.followersCount, label: "Followers")
                Divider().frame(height: 40)
                statItem(value: profileData.followingCount, label: "Following")
            }
            .padding(.vertical, SyrenaDesign.Spacing.md)
        }
    }
    
    private func statItem(value: Int, label: String) -> some View {
        VStack(spacing: SyrenaDesign.Spacing.xxs) {
            Text("\(value)")
                .font(SyrenaDesign.Typography.title2)
                .foregroundStyle(SyrenaDesign.Colors.label)
            
            Text(label)
                .font(SyrenaDesign.Typography.caption)
                .foregroundStyle(SyrenaDesign.Colors.secondaryLabel)
        }
        .frame(maxWidth: .infinity)
    }
    
    // MARK: - Bio Card
    
    private var bioCard: some View {
        GlassCard(
            cornerRadius: SyrenaDesign.CornerRadius.lg,
            tintColor: SyrenaDesign.Colors.glassTintLight,
            isInteractive: true
        ) {
            VStack(alignment: .leading, spacing: SyrenaDesign.Spacing.sm) {
                HStack {
                    Label("Bio", systemImage: "text.alignleft")
                        .font(SyrenaDesign.Typography.callout.weight(.semibold))
                        .foregroundStyle(SyrenaDesign.Colors.label)
                    
                    Spacer()
                    
                    Button {
                        showBioEditor = true
                    } label: {
                        Image(systemName: "pencil")
                            .font(.caption)
                    }
                    .buttonStyle(.syrenaGlass(size: .small, variant: .secondary))
                }
                
                if profileData.bio.isEmpty {
                    Text("Tap edit to add a bio")
                        .font(SyrenaDesign.Typography.body)
                        .foregroundStyle(SyrenaDesign.Colors.tertiaryLabel)
                        .italic()
                } else {
                    Text(profileData.bio)
                        .font(SyrenaDesign.Typography.body)
                        .foregroundStyle(SyrenaDesign.Colors.label)
                        .lineLimit(nil)
                }
            }
            .padding(SyrenaDesign.Spacing.lg)
        }
    }
    
    // MARK: - Action Buttons
    
    private var actionButtons: some View {
        HStack(spacing: SyrenaDesign.Spacing.md) {
            Button {
                withAnimation(SyrenaDesign.Animation.springBouncy) {
                    isFollowing.toggle()
                }
                
                let generator = UIImpactFeedbackGenerator(style: .medium)
                generator.impactOccurred()
            } label: {
                HStack(spacing: SyrenaDesign.Spacing.xs) {
                    Image(systemName: isFollowing ? "checkmark" : "person.badge.plus")
                        .symbolEffect(.bounce, value: isFollowing)
                    Text(isFollowing ? "Following" : "Follow")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.syrenaGlass(
                size: .medium,
                variant: isFollowing ? .secondary : .primary
            ))
            
            Button {
                showShareSheet = true
            } label: {
                HStack(spacing: SyrenaDesign.Spacing.xs) {
                    Image(systemName: "square.and.arrow.up")
                    Text("Share")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.syrenaGlass(size: .medium, variant: .secondary))
        }
    }
    
    // MARK: - Content Section
    
    private var contentSection: some View {
        VStack(alignment: .leading, spacing: SyrenaDesign.Spacing.md) {
            Text("Posts")
                .font(SyrenaDesign.Typography.title3)
                .foregroundStyle(SyrenaDesign.Colors.label)
                .padding(.horizontal, SyrenaDesign.Spacing.xs)
            
            if profileData.posts.isEmpty {
                SyrenaEmptyStateView(
                    icon: "square.stack.3d.up.slash",
                    title: "No Posts Yet",
                    message: "Posts will appear here once you start sharing",
                    actionTitle: "Create Post",
                    action: {
                        print("Create post tapped")
                    }
                )
            } else {
                LazyVGrid(
                    columns: [
                        GridItem(.flexible(), spacing: SyrenaDesign.Spacing.sm),
                        GridItem(.flexible(), spacing: SyrenaDesign.Spacing.sm)
                    ],
                    spacing: SyrenaDesign.Spacing.sm
                ) {
                    ForEach(profileData.posts) { post in
                        PostCard(post: post)
                            .syrenaScrollTransition()
                    }
                }
            }
        }
    }
}

// MARK: - Post Card

struct PostCard: View {
    let post: Post
    @State private var isLiked = false
    
    var body: some View {
        GlassCard(
            cornerRadius: SyrenaDesign.CornerRadius.md,
            tintColor: SyrenaDesign.Colors.glassTintLight,
            isInteractive: true
        ) {
            VStack(alignment: .leading, spacing: SyrenaDesign.Spacing.sm) {
                // Post Image Placeholder
                RoundedRectangle(cornerRadius: SyrenaDesign.CornerRadius.sm)
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
                    .aspectRatio(1, contentMode: .fit)
                    .overlay {
                        Image(systemName: "photo")
                            .font(.system(size: 30))
                            .foregroundStyle(SyrenaDesign.Colors.tertiaryLabel)
                    }
                
                // Post Title
                Text(post.title)
                    .font(SyrenaDesign.Typography.callout.weight(.semibold))
                    .foregroundStyle(SyrenaDesign.Colors.label)
                    .lineLimit(2)
                
                // Engagement Row
                HStack {
                    Button {
                        withAnimation(SyrenaDesign.Animation.springBouncy) {
                            isLiked.toggle()
                        }
                        
                        let generator = UIImpactFeedbackGenerator(style: .light)
                        generator.impactOccurred()
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: isLiked ? "heart.fill" : "heart")
                                .foregroundStyle(isLiked ? .red : SyrenaDesign.Colors.secondaryLabel)
                                .symbolEffect(.bounce, value: isLiked)
                            Text("\(post.likes + (isLiked ? 1 : 0))")
                                .font(SyrenaDesign.Typography.caption2)
                                .foregroundStyle(SyrenaDesign.Colors.secondaryLabel)
                        }
                    }
                    
                    Spacer()
                    
                    HStack(spacing: 4) {
                        Image(systemName: "bubble.right")
                        Text("\(post.comments)")
                    }
                    .font(SyrenaDesign.Typography.caption2)
                    .foregroundStyle(SyrenaDesign.Colors.secondaryLabel)
                }
            }
            .padding(SyrenaDesign.Spacing.sm)
        }
    }
}

// MARK: - Settings View

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: SyrenaDesign.Spacing.lg) {
                    // Account Settings
                    settingsSection(
                        title: "Account",
                        items: [
                            ("person.circle", "Account Information"),
                            ("lock.shield", "Privacy & Security"),
                            ("bell", "Notifications")
                        ]
                    )
                    
                    // Preferences
                    settingsSection(
                        title: "Preferences",
                        items: [
                            ("paintbrush", "Appearance"),
                            ("globe", "Language"),
                            ("accessibility", "Accessibility")
                        ]
                    )
                    
                    // About
                    settingsSection(
                        title: "About",
                        items: [
                            ("info.circle", "About Syrena"),
                            ("doc.text", "Terms of Service"),
                            ("hand.raised", "Privacy Policy")
                        ]
                    )
                }
                .padding(SyrenaDesign.Spacing.lg)
            }
            .background(SyrenaDesign.Colors.background)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                    .buttonStyle(.syrenaGlass(size: .small, variant: .primary))
                }
            }
        }
    }
    
    private func settingsSection(title: String, items: [(String, String)]) -> some View {
        VStack(alignment: .leading, spacing: SyrenaDesign.Spacing.sm) {
            Text(title)
                .font(SyrenaDesign.Typography.footnote.weight(.semibold))
                .foregroundStyle(SyrenaDesign.Colors.secondaryLabel)
                .textCase(.uppercase)
                .padding(.horizontal, SyrenaDesign.Spacing.xs)
            
            GlassCard(
                cornerRadius: SyrenaDesign.CornerRadius.lg,
                tintColor: SyrenaDesign.Colors.glassTintLight,
                isInteractive: true
            ) {
                VStack(spacing: 0) {
                    ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                        Button {
                            print("Tapped: \(item.1)")
                        } label: {
                            HStack {
                                Image(systemName: item.0)
                                    .frame(width: 24)
                                    .foregroundStyle(SyrenaDesign.Colors.accent)
                                
                                Text(item.1)
                                    .font(SyrenaDesign.Typography.body)
                                    .foregroundStyle(SyrenaDesign.Colors.label)
                                
                                Spacer()
                                
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundStyle(SyrenaDesign.Colors.tertiaryLabel)
                            }
                            .padding(SyrenaDesign.Spacing.md)
                        }
                        
                        if index < items.count - 1 {
                            Divider()
                                .padding(.leading, 48)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Data Models

struct ProfileData {
    var name: String
    var username: String
    var bio: String
    var isVerified: Bool
    var postsCount: Int
    var followersCount: Int
    var followingCount: Int
    var posts: [Post]
    
    static let example = ProfileData(
        name: "Alex Johnson",
        username: "alexj",
        bio: "iOS developer passionate about SwiftUI and modern design. Building beautiful apps with Liquid Glass! 🎨📱",
        isVerified: true,
        postsCount: 24,
        followersCount: 1234,
        followingCount: 567,
        posts: [
            Post(id: "1", title: "Beautiful sunset view", likes: 45, comments: 12),
            Post(id: "2", title: "Coffee and code", likes: 89, comments: 23),
            Post(id: "3", title: "New SwiftUI project", likes: 156, comments: 34),
            Post(id: "4", title: "Mountain hiking trip", likes: 234, comments: 45)
        ]
    )
}

struct Post: Identifiable {
    let id: String
    let title: String
    let likes: Int
    let comments: Int
}

// MARK: - Preview

#if DEBUG
struct ProfileView_Previews: PreviewProvider {
    static var previews: some View {
        ProfileView()
    }
}
#endif
