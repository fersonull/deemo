# usage: bash shot.sh name  (reads the size from name.html, writes name.png at 2x)
dir=$(cygpath -m "$PWD")
size=$(node -e 'const s=require("fs").readFileSync(process.argv.at(-1),"utf8");const m=s.match(/width="(\d+)" height="(\d+)"/);console.log(m[1]+","+m[2])' "$1.html")
rm -f "$1.png"
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size="$size" --virtual-time-budget=6000 --screenshot="$dir/$1.png" "file:///$dir/$1.html" 2>&1 | grep -o "bytes written" || echo "no file written"
echo "$1 $size"
ls -la "$1.png"
