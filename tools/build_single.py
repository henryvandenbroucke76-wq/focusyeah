"""Bundle index.html + all scripts/styles into one self-contained Blockhollow.html."""
import os, re
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = lambda f: os.path.join(root, f)
h = open(p('index.html')).read()
h = h.replace('<link rel="stylesheet" href="src/style.css">', '<style>\n' + open(p('src/style.css')).read() + '\n</style>')
h = re.sub(r'<script src="([^"]+)"></script>', lambda m: '<script>\n' + open(p(m.group(1))).read().replace('</script>', '<\\/script>') + '\n</script>', h)
open(p('Blockhollow.html'), 'w').write(h)
print('Blockhollow.html', len(h) // 1024, 'KB')
