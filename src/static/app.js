document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // small helper to escape HTML in participant strings
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Clear and reset activity select so options don't accumulate on re-fetch
      if (activitySelect) {
        activitySelect.innerHTML = "";
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const participants = Array.isArray(details.participants) ? details.participants : [];
        const spotsLeft = details.max_participants - participants.length;

        // Build activity card DOM
        const title = document.createElement("h4");
        title.textContent = name;
        activityCard.appendChild(title);

        const desc = document.createElement("p");
        desc.textContent = details.description;
        activityCard.appendChild(desc);

        const scheduleP = document.createElement("p");
        scheduleP.innerHTML = `<strong>Schedule:</strong> ${escapeHtml(details.schedule)}`;
        activityCard.appendChild(scheduleP);

        const availP = document.createElement("p");
        availP.className = "availability";
        availP.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;
        activityCard.appendChild(availP);

        const participantsDiv = document.createElement("div");
        participantsDiv.className = "participants";
        const participantsTitle = document.createElement("h5");
        participantsTitle.textContent = "Participants";
        participantsDiv.appendChild(participantsTitle);

        if (!participants.length) {
          const info = document.createElement("p");
          info.className = "info";
          info.textContent = "No participants yet.";
          participantsDiv.appendChild(info);
        } else {
          const ul = document.createElement("ul");
          ul.className = "participant-list";

          participants.forEach((p) => {
            const li = document.createElement("li");
            li.className = "participant-item";

            const span = document.createElement("span");
            span.className = "participant-badge";
            span.textContent = p;

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "participant-remove";
            btn.setAttribute("aria-label", `Unregister ${p}`);
            btn.textContent = "✕";
            // attach dataset for debugging if needed
            btn.dataset.activity = name;
            btn.dataset.email = p;

            btn.addEventListener("click", async () => {
              await unregisterParticipant(name, p, li, availP, details.max_participants);
            });

            li.appendChild(span);
            li.appendChild(btn);
            ul.appendChild(li);
          });

          participantsDiv.appendChild(ul);
        }

        activityCard.appendChild(participantsDiv);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  // Unregister a participant from an activity (client-side)
  async function unregisterParticipant(activityName, email, listItemNode, availabilityNode, maxParticipants) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );

      const result = await response.json();

      if (response.ok) {
        // Remove participant from DOM
        if (listItemNode && listItemNode.remove) {
          listItemNode.remove();
        }

        // Update availability text (increase spots by 1)
        if (availabilityNode) {
          const match = availabilityNode.textContent.match(/(\d+)\s+spots/);
          if (match) {
            const spots = parseInt(match[1], 10) + 1;
            availabilityNode.innerHTML = `<strong>Availability:</strong> ${spots} spots left`;
          }
        }

        // show success message briefly
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        setTimeout(() => messageDiv.classList.add("hidden"), 3000);
      } else {
        messageDiv.textContent = result.detail || "Failed to unregister";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      }
    } catch (err) {
      console.error("Error unregistering:", err);
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh the activities list so the newly-registered participant appears
        // immediately without requiring a manual page reload.
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
