import paramiko
import sys
import os

if len(sys.argv) < 3:
    print("Usage: python upload.py <remote_path> <local_file>")
    sys.exit(1)

host = '192.168.7.200'
user = 'sijobtek'
password = 'adm5wira'
remote_path = sys.argv[1]
local_file = sys.argv[2]

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password)
    
    sftp = ssh.open_sftp()
    sftp.put(local_file, remote_path)
    sftp.close()
    
    print(f"Successfully uploaded {local_file} to {remote_path}")
    ssh.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
