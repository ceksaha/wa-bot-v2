import paramiko
import sys
import io

# Force UTF-8 for stdout and stderr to handle server output symbols like checkmarks
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Server Configuration
hostname = '192.168.7.200'
username = 'sijobtek'
password = 'adm5wira'
remote_path = '/opt/wa-order-bot-v2' # Folder untuk Multi-User V2

def deploy():
    try:
        print(f"Connecting to {hostname}...")
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
            print(f"Running: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            
            # Print output (ignoring errors during decode if any)
            out = stdout.read().decode('utf-8', errors='ignore').strip()
            err = stderr.read().decode('utf-8', errors='ignore').strip()
            
            if out: print(f"Output: {out}")
            if err: print(f"Warning/Err: {err}")

        client.close()
        print("\nDeployment Finished Successfully!")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    deploy()
