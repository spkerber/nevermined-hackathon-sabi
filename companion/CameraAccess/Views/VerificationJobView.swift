import SwiftUI
import CoreLocation

enum JobTab: String, CaseIterable {
  case available = "Available"
  case myJobs = "My Jobs"
}

struct VerificationJobView: View {
  let onJobAccepted: (String, String) -> Void  // (jobId, question)
  @StateObject private var apiClient = SabiAPIClient()
  @StateObject private var locationManager = LocationHelper()
  @State private var jobs: [AvailableJob] = []
  @State private var myJobs: [AvailableJob] = []
  @State private var selectedTab: JobTab = .available
  @State private var isLoading = false
  @State private var isAccepting = false
  @State private var acceptingJobId: String?
  @State private var errorMessage: String?
  @State private var showSettings = false

  var body: some View {
    ZStack {
      Color.black.edgesIgnoringSafeArea(.all)

      VStack(spacing: 0) {
        // Top bar
        HStack {
          Text("Jobs")
            .font(.system(size: 24, weight: .bold))
            .foregroundColor(.white)

          Spacer()

          Button {
            showSettings = true
          } label: {
            Image(systemName: "gearshape")
              .foregroundColor(.white)
              .font(.system(size: 20))
          }
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
        .padding(.bottom, 12)

        // Tab picker
        Picker("", selection: $selectedTab) {
          ForEach(JobTab.allCases, id: \.self) { tab in
            Text(tab.rawValue).tag(tab)
          }
        }
        .pickerStyle(.segmented)
        .padding(.horizontal, 20)
        .padding(.bottom, 16)

        ScrollView {
          if selectedTab == .available {
            availableJobsContent
          } else {
            myJobsContent
          }
        }
        .refreshable {
          await loadCurrentTab()
        }

        // Error banner
        if let error = errorMessage {
          Text(error)
            .font(.system(size: 13))
            .foregroundColor(.red)
            .padding(12)
            .frame(maxWidth: .infinity)
            .background(Color.red.opacity(0.15))
            .cornerRadius(8)
            .padding(.horizontal, 20)
            .padding(.bottom, 8)
            .onTapGesture { errorMessage = nil }
        }
      }
    }
    .task {
      locationManager.requestPermission()
      await loadJobs()
    }
    .onChange(of: selectedTab) {
      Task {
        await loadCurrentTab()
      }
    }
    .sheet(isPresented: $showSettings) {
      SettingsView()
    }
  }

  @ViewBuilder
  private var availableJobsContent: some View {
    if isLoading && jobs.isEmpty {
      VStack(spacing: 12) {
        Spacer(minLength: 120)
        ProgressView()
          .scaleEffect(1.5)
          .tint(.white)
        Text("Loading jobs...")
          .font(.system(size: 14))
          .foregroundColor(.white.opacity(0.6))
      }
      .frame(maxWidth: .infinity)
    } else if jobs.isEmpty {
      VStack(spacing: 12) {
        Spacer(minLength: 120)
        Image(systemName: "tray")
          .font(.system(size: 40))
          .foregroundColor(.white.opacity(0.3))
        Text("No jobs available")
          .font(.system(size: 16))
          .foregroundColor(.white.opacity(0.5))
        Text("Pull down to refresh")
          .font(.system(size: 13))
          .foregroundColor(.white.opacity(0.3))
        Button("Seed Demo Jobs") {
          Task { await seedAndRefresh() }
        }
        .font(.system(size: 14, weight: .semibold))
        .foregroundColor(.black)
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
        .background(Color.white)
        .cornerRadius(8)
        .padding(.top, 8)
      }
      .frame(maxWidth: .infinity)
    } else {
      LazyVStack(spacing: 12) {
        ForEach(jobs) { job in
          JobCard(
            job: job,
            distance: distanceString(to: job),
            isAccepting: acceptingJobId == job.id,
            onAccept: {
              Task { await acceptJob(job) }
            }
          )
        }
      }
      .padding(.horizontal, 20)
      .padding(.bottom, 20)
    }
  }

  @ViewBuilder
  private var myJobsContent: some View {
    if isLoading && myJobs.isEmpty {
      VStack(spacing: 12) {
        Spacer(minLength: 120)
        ProgressView()
          .scaleEffect(1.5)
          .tint(.white)
        Text("Loading history...")
          .font(.system(size: 14))
          .foregroundColor(.white.opacity(0.6))
      }
      .frame(maxWidth: .infinity)
    } else if myJobs.isEmpty {
      VStack(spacing: 12) {
        Spacer(minLength: 120)
        Image(systemName: "checkmark.seal")
          .font(.system(size: 40))
          .foregroundColor(.white.opacity(0.3))
        Text("No completed jobs yet")
          .font(.system(size: 16))
          .foregroundColor(.white.opacity(0.5))
        Text("Accept and complete jobs to see them here")
          .font(.system(size: 13))
          .foregroundColor(.white.opacity(0.3))
      }
      .frame(maxWidth: .infinity)
    } else {
      LazyVStack(spacing: 12) {
        ForEach(myJobs) { job in
          HistoryJobCard(job: job)
        }
      }
      .padding(.horizontal, 20)
      .padding(.bottom, 20)
    }
  }

  private func loadCurrentTab() async {
    if selectedTab == .available {
      await loadJobs()
    } else {
      await loadMyJobs()
    }
  }

  private func loadJobs() async {
    isLoading = true
    errorMessage = nil
    do {
      let fetched = try await apiClient.listAvailableJobs()
      if !Task.isCancelled {
        jobs = fetched
      }
    } catch is CancellationError {
    } catch let urlError as URLError where urlError.code == .cancelled {
    } catch {
      if !Task.isCancelled {
        errorMessage = error.localizedDescription
      }
    }
    if !Task.isCancelled {
      isLoading = false
    }
  }

  private func loadMyJobs() async {
    isLoading = true
    errorMessage = nil
    do {
      let fetched = try await apiClient.listMyVerifications(verifierId: "iphone-verifier")
      if !Task.isCancelled {
        myJobs = fetched
      }
    } catch is CancellationError {
    } catch let urlError as URLError where urlError.code == .cancelled {
    } catch {
      if !Task.isCancelled {
        errorMessage = error.localizedDescription
      }
    }
    if !Task.isCancelled {
      isLoading = false
    }
  }

  private func seedAndRefresh() async {
    isLoading = true
    errorMessage = nil
    do {
      try await apiClient.seedJobs()
      let fetched = try await apiClient.listAvailableJobs()
      if !Task.isCancelled {
        jobs = fetched
      }
    } catch is CancellationError {
    } catch let urlError as URLError where urlError.code == .cancelled {
    } catch {
      if !Task.isCancelled {
        errorMessage = error.localizedDescription
      }
    }
    if !Task.isCancelled {
      isLoading = false
    }
  }

  private func acceptJob(_ job: AvailableJob) async {
    acceptingJobId = job.id
    errorMessage = nil
    do {
      try await apiClient.acceptJob(jobId: job.id, verifierId: "iphone-verifier")
      try await apiClient.startSession(jobId: job.id)
      onJobAccepted(job.id, job.question)
    } catch {
      let msg = error.localizedDescription
      if msg.contains("cancelled") || msg.contains("Cannot accept") {
        errorMessage = "This job is no longer available. Refreshing..."
        // Remove the stale job from the list and refresh
        jobs.removeAll { $0.id == job.id }
        Task {
          try? await Task.sleep(nanoseconds: 1_500_000_000)
          await loadJobs()
          errorMessage = nil
        }
      } else {
        errorMessage = msg
      }
    }
    acceptingJobId = nil
  }

  private func distanceString(to job: AvailableJob) -> String {
    guard let userLocation = locationManager.lastLocation else {
      return "-- mi"
    }
    let jobLocation = CLLocation(latitude: job.targetLat, longitude: job.targetLng)
    let meters = userLocation.distance(from: jobLocation)
    let miles = meters / 1609.34
    if miles < 0.1 {
      let feet = Int(meters * 3.28084)
      return "\(feet) ft"
    } else if miles < 10 {
      return String(format: "%.1f mi", miles)
    } else {
      return String(format: "%.0f mi", miles)
    }
  }
}

// MARK: - Job Card

private struct JobCard: View {
  let job: AvailableJob
  let distance: String
  let isAccepting: Bool
  let onAccept: () -> Void

  private var categoryIcon: String {
    switch job.category {
    case "Business Hours": return "clock"
    case "Traffic & Parking": return "car"
    case "Wait Times": return "person.3"
    case "Menu & Prices": return "menucard"
    case "Infrastructure": return "wrench.and.screwdriver"
    default: return "questionmark.circle"
    }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      // Category + distance row
      HStack {
        HStack(spacing: 6) {
          Image(systemName: categoryIcon)
            .font(.system(size: 12))
            .foregroundColor(.white.opacity(0.7))
          Text(job.category)
            .font(.system(size: 12, weight: .medium))
            .foregroundColor(.white.opacity(0.7))
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 4)
        .background(Color.white.opacity(0.1))
        .cornerRadius(6)

        Spacer()

        HStack(spacing: 4) {
          Image(systemName: "location.fill")
            .font(.system(size: 10))
          Text(distance)
            .font(.system(size: 12, weight: .medium))
        }
        .foregroundColor(.white.opacity(0.6))
      }

      // Question
      Text(job.question)
        .font(.system(size: 16, weight: .medium))
        .foregroundColor(.white)
        .lineLimit(3)
        .fixedSize(horizontal: false, vertical: true)

      // Payout + Accept
      HStack {
        Text(String(format: "$%.0f", job.payout))
          .font(.system(size: 20, weight: .bold))
          .foregroundColor(.green)

        Spacer()

        Button(action: onAccept) {
          HStack(spacing: 6) {
            if isAccepting {
              ProgressView()
                .tint(.black)
                .scaleEffect(0.8)
            }
            Text(isAccepting ? "Accepting..." : "Accept")
              .font(.system(size: 14, weight: .bold))
          }
          .foregroundColor(.black)
          .padding(.horizontal, 24)
          .padding(.vertical, 10)
          .background(Color.green)
          .cornerRadius(8)
        }
        .disabled(isAccepting)
      }
    }
    .padding(16)
    .background(Color.white.opacity(0.08))
    .cornerRadius(14)
  }
}

// MARK: - History Job Card

private struct HistoryJobCard: View {
  let job: AvailableJob

  private var statusColor: Color {
    switch job.status {
    case "verified": return .green
    case "in_progress": return .blue
    case "accepted": return .indigo
    case "connecting": return .yellow
    case "cancelled": return .gray
    default: return .white.opacity(0.5)
    }
  }

  private var statusLabel: String {
    switch job.status {
    case "verified": return "Verified"
    case "in_progress": return "In Progress"
    case "accepted": return "Accepted"
    case "connecting": return "Connecting"
    case "cancelled": return "Cancelled"
    default: return job.status
    }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        HStack(spacing: 6) {
          Circle()
            .fill(statusColor)
            .frame(width: 8, height: 8)
          Text(statusLabel)
            .font(.system(size: 12, weight: .semibold))
            .foregroundColor(statusColor)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 4)
        .background(statusColor.opacity(0.15))
        .cornerRadius(6)

        Spacer()

        Text(String(format: "$%.0f", job.payout))
          .font(.system(size: 14, weight: .bold))
          .foregroundColor(.green)
      }

      Text(job.question)
        .font(.system(size: 15, weight: .medium))
        .foregroundColor(.white)
        .lineLimit(2)

      Text(job.category)
        .font(.system(size: 12))
        .foregroundColor(.white.opacity(0.5))
    }
    .padding(16)
    .background(Color.white.opacity(0.08))
    .cornerRadius(14)
  }
}

// MARK: - Location Helper

class LocationHelper: NSObject, ObservableObject, CLLocationManagerDelegate {
  @Published var lastLocation: CLLocation?
  private let manager = CLLocationManager()

  override init() {
    super.init()
    manager.delegate = self
    manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
  }

  func requestPermission() {
    manager.requestWhenInUseAuthorization()
    manager.startUpdatingLocation()
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    lastLocation = locations.last
  }
}
