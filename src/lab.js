export const COMMANDS = {
  help: [
    'Available demo commands:',
    '  help                 show this help',
    '  whoami               current trainee identity',
    '  nmap 10.8.0.22       scan the training target',
    '  services             list discovered services',
    '  hydra -l admin -P wordlist.txt ssh://10.8.0.22',
    '  cat flag.txt         read flag after Hydra succeeds',
    '  clear                clear the terminal',
  ],
  whoami: ['kali@cyberpod — student / demo mode'],
  nmap: [
    'Starting Nmap 7.94 ( https://nmap.org ) at demo-lab',
    'Nmap scan report for target.cyberpod.local (10.8.0.22)',
    'Host is up (0.004s latency).',
    'PORT   STATE SERVICE VERSION',
    '22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu',
    'Nmap done: 1 IP address (1 host up) scanned in 1.12 seconds',
  ],
  services: [
    'Discovered services',
    '  22/tcp   ssh    OpenSSH 8.9    [ATTACK SURFACE]',
  ],
  hydra: [
    'Hydra v9.5 starting at demo-lab',
    '[DATA] attacking ssh://10.8.0.22:22/',
    '[22][ssh] host: 10.8.0.22   login: admin   password: labpass123',
    '1 of 1 target successfully completed, 1 valid password found',
    '[NOTICE] credentials saved to /home/kali/hydra-result.txt',
  ],
  cat: [
    'admin@10.8.0.22:~$ cat /root/flag.txt',
    'CYBERPOD{hydra_ssh_cracked}',
  ],
}
