import paramiko
import sys

# Server Configuration
hostname = '192.168.7.200'
username = 'sijobtek'
password = 'adm5wira'
remote_path = '/opt/wa-order-bot' # Sesuaikan dengan folder di server Anda

def deploy():
    try:
        print(f"📡 Menghubungkan ke {hostname}...")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(hostname, username=username, password=password)
        
        # List perintah yang akan dijalankan di server
        commands = [
            f"cd {remote_path} && git pull origin main",
            f"cd {remote_path} && npm install --production",
            f"echo '{password}' | sudo -S pm2 restart 2 || pm2 restart server"
        ]
        
        for cmd in commands:
            print(f"🏃 Menjalankan: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            
            # Print output
            out = stdout.read().decode().strip()
            err = stderr.read().decode().strip()
            
            if out: print(f"✅ Output: {out}")
            if err: print(f"⚠️ Warning/Error: {err}")

        client.close()
        print("\n✨ Deployment Selesai! Aplikasi V2 sudah diperbarui di server.")

    except Exception as e:
        print(f"❌ Error saat deployment: {e}")

if __name__ == "__main__":
    deploy()
