document.addEventListener('DOMContentLoaded', () => {
    loadSchedules();

    // Set default datetime to now + 5 mins
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    document.getElementById('datetime').value = localIso;

    // Handle Form Submit
    document.getElementById('scheduleForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);

        try {
            const response = await fetch('/api/schedule', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('Scheduled successfully!');
                e.target.reset();
                document.getElementById('datetime').value = localIso; // Reset time default
                loadSchedules();
            } else {
                alert('Error scheduling message.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to connect to server.');
        }
    });
});

async function loadSchedules() {
    try {
        const response = await fetch('/api/schedules');
        const tasks = await response.json();
        const list = document.getElementById('scheduleList');

        list.innerHTML = '';

        if (tasks.length === 0) {
            list.innerHTML = '<li style="text-align:center; color: #b5bac1; padding: 1rem;">No pending messages.</li>';
            return;
        }

        tasks.forEach(task => {
            const date = new Date(task.scheduledTime).toLocaleString();
            const li = document.createElement('li');
            li.className = 'schedule-item';
            li.innerHTML = `
                <div class="schedule-info">
                    <span class="time">${date}</span>
                    <span class="details">ID: ${task.id} | Channel: ${task.channelId} | ${task.recurrence}</span>
                </div>
                <button class="delete-btn" onclick="deleteTask(${task.id})">Cancel</button>
            `;
            list.appendChild(li);
        });
    } catch (error) {
        console.error('Failed to load schedules:', error);
    }
}

async function deleteTask(id) {
    if (!confirm('Are you sure you want to cancel this scheduled message?')) return;

    try {
        await fetch(`/api/schedule/${id}`, { method: 'DELETE' });
        loadSchedules();
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}
