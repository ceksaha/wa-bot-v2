import paramiko
import os

hostname = '192.168.7.200'
username = 'sijobtek'
password = 'adm5wira' # Fixed password

files_to_upload = [
    ('whatsapp.js', '/opt/wa-order-bot/services/whatsapp.js'),
    ('api.js', '/opt/wa-order-bot/routes/api.js'),
    ('dashboard.html', '/opt/wa-order-bot/public/dashboard.html'),
    ('dashboard.js', '/opt/wa-order-bot/public/js/dashboard.js'),
    ('style.css', '/opt/wa-order-bot/public/css/style.css'),
]

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password)
    
    sftp = client.open_sftp()
    
    for local_file, remote_path in files_to_upload:
        print(f"Uploading {local_file} to {remote_path}...")
        sftp.put(local_file, remote_path)
    
    sftp.close()
    
    print("Restarting bot via PM2...")
    stdin, stdout, stderr = client.exec_command("echo 'adm5wira' | sudo -S pm2 restart 2")
    print(stdout.read().decode())
    print(stderr.read().decode())
    
    client.close()
    print("Deployment finished successfully!")

except Exception as e:
    print(f"Error during deployment: {e}")
