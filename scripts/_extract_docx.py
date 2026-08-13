import sys, zipfile, re
from xml.etree import ElementTree as ET

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

path = sys.argv[1]
with zipfile.ZipFile(path) as z:
    xml = z.read("word/document.xml")

root = ET.fromstring(xml)
body = root.find("w:body", NS)

for p in body.findall("w:p", NS):
    style = ""
    pPr = p.find("w:pPr", NS)
    if pPr is not None:
        pStyle = pPr.find("w:pStyle", NS)
        if pStyle is not None:
            style = pStyle.get(f"{{{NS['w']}}}val") or ""
    texts = [t.text or "" for t in p.iter(f"{{{NS['w']}}}t")]
    line = "".join(texts).strip()
    if not line:
        continue
    print(f"[{style or 'Normal'}] {line}")
