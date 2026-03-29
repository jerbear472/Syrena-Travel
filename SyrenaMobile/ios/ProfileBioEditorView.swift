// Copyright 2026 Syrena Mobile. All rights reserved.
// Profile Bio Editor - Modern Liquid Glass Implementation

import SwiftUI

/// Modern profile bio editor with Liquid Glass design
struct ProfileBioEditorView: View {
    @Environment(\.dismiss) private var dismiss
    @FocusState private var isFocused: Bool
    @State private var bioText: String
    @State private var characterCount: Int = 0
    @State private var isSaving: Bool = false
    @State private var showSuccessAnimation: Bool = false
    
    let maxCharacters: Int = 500
    let onSave: (String) -> Void
    
    init(initialBio: String = "", onSave: @escaping (String) -> Void) {
        _bioText = State(initialValue: initialBio)
        _characterCount = State(initialValue: initialBio.count)
        self.onSave = onSave
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: SyrenaDesign.Spacing.lg) {
                    // Bio Editor Card
                    bioEditorCard
                    
                    // Character Counter Card
                    characterCounterCard
                    
                    // Tips Card
                    tipsCard
                }
                .padding(SyrenaDesign.Spacing.lg)
            }
            .background(SyrenaDesign.Colors.background)
            .navigationTitle("Edit Bio")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .buttonStyle(.syrenaGlass(size: .small, variant: .secondary))
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    saveButton
                }
            }
            .overlay {
                if showSuccessAnimation {
                    successOverlay
                }
            }
        }
    }
    
    // MARK: - Bio Editor Card
    
    private var bioEditorCard: some View {
        GlassCard(
            cornerRadius: SyrenaDesign.CornerRadius.xl,
            tintColor: SyrenaDesign.Colors.glassTintBlue,
            isInteractive: true
        ) {
            VStack(alignment: .leading, spacing: SyrenaDesign.Spacing.sm) {
                HStack {
                    Label("Your Bio", systemImage: "text.alignleft")
                        .font(SyrenaDesign.Typography.title3)
                        .foregroundStyle(SyrenaDesign.Colors.label)
                    
                    Spacer()
                    
                    if isFocused {
                        Image(systemName: "pencil")
                            .font(.caption)
                            .foregroundStyle(SyrenaDesign.Colors.accent)
                            .symbolEffect(.bounce, value: isFocused)
                    }
                }
                
                TextEditor(text: $bioText)
                    .font(SyrenaDesign.Typography.body)
                    .frame(minHeight: 200)
                    .scrollContentBackground(.hidden)
                    .background(Color.clear)
                    .focused($isFocused)
                    .onChange(of: bioText) { oldValue, newValue in
                        // Enforce character limit
                        if newValue.count > maxCharacters {
                            bioText = String(newValue.prefix(maxCharacters))
                        }
                        characterCount = bioText.count
                    }
                    .overlay(alignment: .topLeading) {
                        if bioText.isEmpty && !isFocused {
                            Text("Tell people about yourself...")
                                .font(SyrenaDesign.Typography.body)
                                .foregroundStyle(SyrenaDesign.Colors.tertiaryLabel)
                                .padding(.top, 8)
                                .padding(.leading, 4)
                                .allowsHitTesting(false)
                        }
                    }
            }
            .padding(SyrenaDesign.Spacing.lg)
        }
        .onTapGesture {
            isFocused = true
        }
    }
    
    // MARK: - Character Counter Card
    
    private var characterCounterCard: some View {
        GlassCard(
            cornerRadius: SyrenaDesign.CornerRadius.md,
            tintColor: counterTintColor,
            isInteractive: false
        ) {
            HStack {
                Label(
                    "\(characterCount) / \(maxCharacters) characters",
                    systemImage: characterCountIcon
                )
                .font(SyrenaDesign.Typography.footnote)
                .foregroundStyle(counterColor)
                
                Spacer()
                
                ProgressView(value: Double(characterCount), total: Double(maxCharacters))
                    .tint(counterColor)
                    .frame(width: 80)
            }
            .padding(SyrenaDesign.Spacing.md)
        }
        .animation(SyrenaDesign.Animation.springNormal, value: characterCount)
    }
    
    private var counterColor: Color {
        let percentage = Double(characterCount) / Double(maxCharacters)
        if percentage >= 1.0 {
            return SyrenaDesign.Colors.error
        } else if percentage >= 0.9 {
            return SyrenaDesign.Colors.warning
        } else {
            return SyrenaDesign.Colors.secondaryLabel
        }
    }
    
    private var counterTintColor: Color {
        let percentage = Double(characterCount) / Double(maxCharacters)
        if percentage >= 1.0 {
            return Color.red.opacity(0.15)
        } else if percentage >= 0.9 {
            return Color.orange.opacity(0.15)
        } else {
            return SyrenaDesign.Colors.glassTintLight
        }
    }
    
    private var characterCountIcon: String {
        let percentage = Double(characterCount) / Double(maxCharacters)
        if percentage >= 1.0 {
            return "exclamationmark.triangle.fill"
        } else if percentage >= 0.9 {
            return "exclamationmark.circle.fill"
        } else {
            return "character.cursor.ibeam"
        }
    }
    
    // MARK: - Tips Card
    
    private var tipsCard: some View {
        GlassCard(
            cornerRadius: SyrenaDesign.CornerRadius.md,
            tintColor: SyrenaDesign.Colors.glassTintPurple,
            isInteractive: false
        ) {
            VStack(alignment: .leading, spacing: SyrenaDesign.Spacing.sm) {
                Label("Tips for a Great Bio", systemImage: "lightbulb.fill")
                    .font(SyrenaDesign.Typography.callout.weight(.semibold))
                    .foregroundStyle(SyrenaDesign.Colors.label)
                
                VStack(alignment: .leading, spacing: SyrenaDesign.Spacing.xs) {
                    tipRow(icon: "checkmark.circle.fill", text: "Be authentic and genuine")
                    tipRow(icon: "checkmark.circle.fill", text: "Share your interests")
                    tipRow(icon: "checkmark.circle.fill", text: "Keep it concise")
                    tipRow(icon: "checkmark.circle.fill", text: "Update regularly")
                }
            }
            .padding(SyrenaDesign.Spacing.md)
        }
    }
    
    private func tipRow(icon: String, text: String) -> some View {
        HStack(spacing: SyrenaDesign.Spacing.xs) {
            Image(systemName: icon)
                .font(.caption2)
                .foregroundStyle(SyrenaDesign.Colors.success)
            
            Text(text)
                .font(SyrenaDesign.Typography.footnote)
                .foregroundStyle(SyrenaDesign.Colors.secondaryLabel)
        }
    }
    
    // MARK: - Save Button
    
    private var saveButton: some View {
        Button(action: handleSave) {
            HStack(spacing: SyrenaDesign.Spacing.xs) {
                if isSaving {
                    ProgressView()
                        .scaleEffect(0.8)
                } else {
                    Image(systemName: "checkmark")
                        .symbolEffect(.bounce, value: showSuccessAnimation)
                }
                Text(isSaving ? "Saving..." : "Save")
            }
        }
        .buttonStyle(.syrenaGlass(size: .small, variant: .primary))
        .disabled(isSaving || bioText.count > maxCharacters)
    }
    
    // MARK: - Success Overlay
    
    private var successOverlay: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()
            
            GlassCard(
                cornerRadius: SyrenaDesign.CornerRadius.xxl,
                tintColor: SyrenaDesign.Colors.glassTintBlue,
                isInteractive: false
            ) {
                VStack(spacing: SyrenaDesign.Spacing.md) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(SyrenaDesign.Colors.success)
                        .symbolEffect(.bounce)
                    
                    Text("Bio Updated!")
                        .font(SyrenaDesign.Typography.title2)
                        .foregroundStyle(SyrenaDesign.Colors.label)
                }
                .padding(SyrenaDesign.Spacing.xxl)
            }
            .transition(.scale.combined(with: .opacity))
        }
    }
    
    // MARK: - Actions
    
    private func handleSave() {
        guard !isSaving else { return }
        
        isFocused = false
        isSaving = true
        
        // Haptic feedback
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
        
        // Simulate save with animation
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            isSaving = false
            
            withAnimation(SyrenaDesign.Animation.springBouncy) {
                showSuccessAnimation = true
            }
            
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                onSave(bioText)
                
                withAnimation(SyrenaDesign.Animation.springNormal) {
                    showSuccessAnimation = false
                }
                
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    dismiss()
                }
            }
        }
    }
}

// MARK: - Preview

#if DEBUG
struct ProfileBioEditorView_Previews: PreviewProvider {
    static var previews: some View {
        ProfileBioEditorView(
            initialBio: "Software developer passionate about building great iOS apps. Love hiking and photography in my free time.",
            onSave: { newBio in
                print("Saved bio: \(newBio)")
            }
        )
    }
}
#endif
