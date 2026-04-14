import os

file_path = '/opt/wa-order-bot/public/dashboard.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace inline styles with classes for responsiveness
content = content.replace('style="display: flex; gap: 1.5rem; align-items: center;"', 'class="header-actions"')
content = content.replace('style="display: flex; gap: 2rem;"', 'class="config-container"')
content = content.replace('style="width: 250px; background: var(--glass); border: 1px solid var(--glass-border); border-radius: 1rem; padding: 1rem; height: fit-content;"', 'class="config-sidebar"')
content = content.replace('style="flex: 1;"', 'class="config-main"')
content = content.replace('style="display: flex; gap: 1rem; align-items: center;"', 'class="table-actions"')
content = content.replace('style="background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 0.5rem 1rem; border-radius: 0.5rem; color: #fff; width: 300px;"', 'class="search-input"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated dashboard.html")
