cd "c:\Users\hp\Desktop\VerdantCare Medical Center"
& "C:\Program Files\Git\cmd\git.exe" add -A
& "C:\Program Files\Git\cmd\git.exe" commit -m "perf: reduce page loading time - increase QueryClient staleTime to 10min, disable retries - add 15s axios timeout to fail fast - lazy-load notifications (only fetch when panel opened) - reduce notification polling from 60s to 120s"
& "C:\Program Files\Git\cmd\git.exe" push
