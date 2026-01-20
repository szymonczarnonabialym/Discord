let isEditing = false;
let editId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadSchedules();
    loadChannels();
    resetForm();

    // Handle Form Submit
    document.getElementById('scheduleForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);

        // Add channel Name manually (to ensure it's captured)
        const select = document.getElementById('channelId');
        if (select.selectedIndex !== -1) {
            const channelName = select.options[select.selectedIndex].text;
            formData.append('channelName', channelName);
        }

        // Edit Mode handling
        const url = isEditing ? `/api/schedule/${editId}` : '/api/schedule';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                body: formData
            });

            if (response.ok) {
                alert(isEditing ? 'Updated successfully!' : 'Scheduled successfully!');
                resetForm();
                loadSchedules();
            } else {
                alert('Error saving message.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to connect to server.');
        }
    });

    // Cancel Edit Button Logic
    // Check if button exists, if not create it
    if (!document.getElementById('cancelEditBtn')) {
        const cancelEditBtn = document.createElement('button');
        cancelEditBtn.type = 'button';
        cancelEditBtn.textContent = 'Cancel Edit';
        cancelEditBtn.id = 'cancelEditBtn';
        cancelEditBtn.style.display = 'none';
        cancelEditBtn.style.backgroundColor = '#64748b';
        cancelEditBtn.style.marginTop = '10px';
        cancelEditBtn.onclick = resetForm;
        document.getElementById('scheduleForm').appendChild(cancelEditBtn);
    }
});

function resetForm() {
    document.getElementById('scheduleForm').reset();
    isEditing = false;
    editId = null;
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Schedule Message';

    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';

    // Set default time
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    const dateInput = document.getElementById('datetime');
    if (dateInput) dateInput.value = localIso;
}

async function loadSchedules() {
    try {
        const response = await fetch('/api/schedules');
        const tasks = await response.json();
        const list = document.getElementById('scheduleList');

        if (!list) return;
        list.innerHTML = '';

        if (tasks.length === 0) {
            list.innerHTML = '<li style="text-align:center; color: #b5bac1; padding: 1rem;">No pending messages.</li>';
            return;
        }

        tasks.forEach(task => {
            const date = new Date(task.scheduledTime).toLocaleString();
            // Fix path separator for URL
            const imageUrl = task.imagePath ? task.imagePath.replace(/\\/g, '/') : '';

            const li = document.createElement('li');
            li.className = 'schedule-item';

            let imageHtml = '';
            if (imageUrl) {
                imageHtml = `<img src="/${imageUrl}" alt="Thumbnail" class="thumbnail" onclick="window.open('/${imageUrl}')">`;
            }

            li.innerHTML = `
                <div class="schedule-content">
                    ${imageHtml}
                    <div class="schedule-info">
                        <div class="header">
                            <span class="channel-name">${task.channelName || task.channelId}</span>
                            <span class="time">${date}</span>
                        </div>
                        <div class="message-preview">${task.message || '<i>No text</i>'}</div>
                        <div class="meta">Recurrence: ${task.recurrence}</div>
                    </div>
                </div>
                <div class="actions">
                    <button class="edit-btn" onclick='editTask(${JSON.stringify(task).replace(/'/g, "&#39;")})'>Edit</button>
                    <button class="delete-btn" onclick="deleteTask(${task.id})">Cancel</button>
                </div>
            `;
            list.appendChild(li);
        });
    } catch (error) {
        console.error('Failed to load schedules:', error);
    }
}

function editTask(task) {
    isEditing = true;
    editId = task.id;

    document.querySelector('button[type="submit"]').textContent = 'Update Schedule';
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'block';

    const channelSelect = document.getElementById('channelId');
    if (channelSelect) channelSelect.value = task.channelId;

    const msgInput = document.getElementById('message');
    if (msgInput) msgInput.value = task.message || '';

    const recurSelect = document.getElementById('recurrence');
    if (recurSelect) recurSelect.value = task.recurrence;

    // Set datetime-local
    const dt = new Date(task.scheduledTime);
    const iso = new Date(dt.getTime() - (dt.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    const dateInput = document.getElementById('datetime');
    if (dateInput) dateInput.value = iso;

    document.getElementById('scheduleForm').scrollIntoView({ behavior: 'smooth' });
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

async function loadChannels() {
    const select = document.getElementById('channelId');
    if (!select) return;

    try {
        const response = await fetch('/api/channels');
        if (response.status === 503) {
            select.innerHTML = '<option value="" disabled>Bot starting...</option>';
            setTimeout(loadChannels, 2000);
            return;
        }

        const channels = await response.json();
        const currentVal = select.value; // Keep selection if reloading

        select.innerHTML = '<option value="" disabled selected>Select a channel</option>';
        if (channels.length === 0) {
            select.innerHTML += '<option value="" disabled>No text channels found</option>';
        }

        channels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.id;
            option.textContent = channel.name;
            select.appendChild(option);
        });

        if (currentVal) select.value = currentVal;
    } catch (error) {
        console.error('Error loading channels:', error);
        select.innerHTML = '<option value="" disabled>Error loading channels</option>';
    }
}
