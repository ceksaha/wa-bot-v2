import paramiko
import sys
import io

# Set stdout to utf-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

if len(sys.argv) < 3:
    print("Usage: python ssh_run.py <user> '<command>'")
    sys.exit(1)

host = '192.168.7.200'
user = sys.argv[1]
password = 'adm5wira'
command = sys.argv[2]

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password)
    
    stdin, stdout, stderr = ssh.exec_command(command)
    
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    
    if out:
        print(out)
    if err:
        print("STDERR:")
        print(err)
        
    ssh.close()
except Exception as e:
    print(f"Error ({user}): {e}")
