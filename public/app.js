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
        const select = document.getElementById('channelId');
        if (select.selectedIndex !== -1) {
            const channelName = select.options[select.selectedIndex].text;
            formData.append('channelName', channelName);
        }

        const url = isEditing ? `/api/schedule/${editId}` : '/api/schedule';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, { method: method, body: formData });
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

    // Cancel Edit Button
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

    // Handle AI Form Submit
    const aiForm = document.getElementById('aiForm');
    if (aiForm) {
        aiForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('ai-submit-btn');
            const originalText = btn.textContent;
            btn.textContent = '⏳ Generating... (This may take 10s)';
            btn.disabled = true;

            const formData = new FormData(e.target);
            const select = document.getElementById('ai-channelId');
            const channelName = select.options[select.selectedIndex].text;
            formData.append('channelName', channelName);

            try {
                const response = await fetch('/api/generate-content', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                if (response.ok) {
                    alert(`Success! Generated and scheduled ${result.count} posts.`);
                    aiForm.reset();
                    loadSchedules();
                    // Clear previews
                    const previews = document.querySelectorAll('.paste-preview');
                    previews.forEach(p => p.remove());
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (error) {
                console.error('AI Error:', error);
                alert('Connection failed: ' + error.message);
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    }

    // Paste Support
    document.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                const aiSection = document.getElementById('ai-section');
                const isAiActive = aiSection && aiSection.style.display !== 'none';

                const inputId = isAiActive ? 'ai-image' : 'image';
                const fileInput = document.getElementById(inputId);

                if (fileInput) {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(blob);
                    fileInput.files = dataTransfer.files;
                    showPastePreview(inputId, blob);
                }
            }
        }
    });

    // Preview on file select
    ['image', 'ai-image'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => {
                if (el.files && el.files[0]) {
                    showPastePreview(id, el.files[0]);
                }
            });
        }
    });

    // Set defaults
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const iso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    if (document.getElementById('datetime')) document.getElementById('datetime').value = iso;
    if (document.getElementById('ai-startTime')) document.getElementById('ai-startTime').value = iso;
});

function resetForm() {
    document.getElementById('scheduleForm').reset();
    isEditing = false;
    editId = null;
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Schedule Message';
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    const previews = document.querySelectorAll('.paste-preview');
    previews.forEach(p => p.remove());
}

function showPastePreview(inputId, file) {
    const parent = document.getElementById(inputId).parentNode;
    const existing = parent.querySelector('.paste-preview');
    if (existing) existing.remove();

    const img = document.createElement('img');
    img.className = 'paste-preview';
    img.style.maxWidth = '100px';
    img.style.marginTop = '10px';
    img.style.borderRadius = '4px';
    img.style.border = '2px solid #5865F2';

    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.readAsDataURL(file);

    parent.appendChild(img);
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.card[id$="-section"]').forEach(s => s.style.display = 'none');
    if (tab === 'manual') {
        document.getElementById('manual-section').style.display = 'block';
        document.querySelector('button[onclick="switchTab(\'manual\')"]').classList.add('active');
    } else {
        document.getElementById('ai-section').style.display = 'block';
        document.querySelector('button[onclick="switchTab(\'ai\')"]').classList.add('active');
    }
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
            const imageUrl = task.imagePath ? task.imagePath.replace(/\\/g, '/') : '';
            const li = document.createElement('li');
            li.className = 'schedule-item';
            let imageHtml = imageUrl ? `<img src="/${imageUrl}" alt="Thumbnail" class="thumbnail" onclick="window.open('/${imageUrl}')">` : '';
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
    } catch (error) { console.error('LoadSchedules error:', error); }
}

function editTask(task) {
    isEditing = true;
    editId = task.id;
    document.querySelector('button[type="submit"]').textContent = 'Update Schedule';
    if (document.getElementById('cancelEditBtn')) document.getElementById('cancelEditBtn').style.display = 'block';
    if (document.getElementById('channelId')) document.getElementById('channelId').value = task.channelId;
    if (document.getElementById('message')) document.getElementById('message').value = task.message || '';
    if (document.getElementById('recurrence')) document.getElementById('recurrence').value = task.recurrence;
    const dt = new Date(task.scheduledTime);
    const iso = new Date(dt.getTime() - (dt.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    if (document.getElementById('datetime')) document.getElementById('datetime').value = iso;
    document.getElementById('scheduleForm').scrollIntoView({ behavior: 'smooth' });
}

async function deleteTask(id) {
    if (!confirm('Are you sure?')) return;
    try {
        await fetch(`/api/schedule/${id}`, { method: 'DELETE' });
        loadSchedules();
    } catch (error) { console.error('Delete error:', error); }
}

async function loadChannels() {
    const selects = [document.getElementById('channelId'), document.getElementById('ai-channelId')];
    try {
        const response = await fetch('/api/channels');
        if (response.status === 503) { setTimeout(loadChannels, 2000); return; }
        const channels = await response.json();
        selects.forEach(select => {
            if (!select) return;
            select.innerHTML = '<option value="" disabled selected>Select a channel</option>';
            channels.forEach(channel => {
                const option = document.createElement('option');
                option.value = channel.id;
                option.textContent = channel.name;
                select.appendChild(option);
            });
        });
    } catch (error) { console.error('LoadChannels error:', error); }
}
