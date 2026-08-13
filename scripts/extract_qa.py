#!/usr/bin/env python3
"""Extract Q&A pairs and topic structure from the Foundations of Law docx."""
import json
import re
from docx import Document

DOC_PATH = "/home/z/my-project/upload/Foundations of Law - Open Book Exam Companion (1).docx"

doc = Document(DOC_PATH)

# Build list of (style, text) tuples
paragraphs = [(p.style.name, p.text) for p in doc.paragraphs]

# --- Phase 1: Find Part F and Part G sections (the Q&A pairs) ---
part_f_start = None
part_g_start = None
part_g_q23 = None  # G.5 starts at Q23
end_idx = None

for i, (style, text) in enumerate(paragraphs):
    t = text.strip()
    if t.startswith("PART F") and part_f_start is None:
        part_f_start = i
    if t.startswith("PART G") and part_g_start is None:
        part_g_start = i
    if t.startswith("G.5") and part_g_q23 is None:
        part_g_q23 = i
    if t.startswith("End of Exam Companion"):
        end_idx = i

print(f"Part F starts at paragraph {part_f_start}")
print(f"Part G starts at paragraph {part_g_start}")
print(f"G.5 (Q23+) starts at paragraph {part_g_q23}")
print(f"End at paragraph {end_idx}")

# --- Phase 2: Extract Q&A pairs ---
def extract_qa_pairs(start_idx, end_idx):
    pairs = []
    current_topic = None
    i = start_idx
    while i < end_idx:
        style, text = paragraphs[i]
        t = text.strip()
        if style == "Heading 2" and t.startswith("TOPIC"):
            current_topic = t
            i += 1
            continue
        m = re.match(r"^(Q\d+)\.\s*(.*)", t)
        if m:
            qnum = m.group(1)
            qtext = m.group(2)
            j = i + 1
            while j < end_idx and not paragraphs[j][1].strip():
                j += 1
            answer_parts = []
            if j < end_idx and paragraphs[j][1].strip().startswith("Answer."):
                answer_parts.append(paragraphs[j][1].strip())
                j += 1
                while j < end_idx:
                    s2, t2 = paragraphs[j]
                    t2s = t2.strip()
                    if not t2s:
                        j += 1
                        continue
                    if re.match(r"^Q\d+\.", t2s):
                        break
                    if s2 == "Heading 2" or s2 == "Heading 1":
                        break
                    answer_parts.append(t2s)
                    j += 1
            full_answer = "\n\n".join(answer_parts)
            pairs.append({
                "qnum": qnum,
                "question": qtext,
                "answer": full_answer,
                "topic_heading": current_topic,
            })
            i = j
            continue
        i += 1
    return pairs

part_f_pairs = extract_qa_pairs(part_f_start, part_g_start)
print(f"\nPart F: extracted {len(part_f_pairs)} Q&A pairs")

part_g_pairs = extract_qa_pairs(part_g_q23, end_idx if end_idx else len(paragraphs))
print(f"Part G (G.5): extracted {len(part_g_pairs)} Q&A pairs")

all_pairs = part_f_pairs + part_g_pairs
print(f"\nTotal Q&A pairs: {len(all_pairs)}")
print("\n--- Q&A Summary ---")
for p in all_pairs:
    print(f"{p['qnum']}: [{p['topic_heading']}] {p['question'][:90]}...")

TOPIC_RE = re.compile(r"TOPIC\s+(\d+)\s+[—-]\s+(.+)")

def parse_topic(heading):
    if not heading:
        return None
    m = TOPIC_RE.match(heading)
    if m:
        return {"num": int(m.group(1)), "title": m.group(2).strip()}
    return None

# Manual mapping for Q23-Q33 (Part G additional answers — no topic heading in source)
EXTRA_TOPIC_MAP = {
    "Q23": (3, "Statutory interpretation"),
    "Q24": (3, "Statutory interpretation"),
    "Q25": (4, "Doctrine of precedent"),
    "Q26": (4, "Doctrine of precedent"),
    "Q27": (8, "First Nations law & Indigenous Australians and the law"),
    "Q28": (10, "Australian legal institutions"),
    "Q29": (11, "NSW and Commonwealth constitutional history"),
    "Q30": (10, "Australian legal institutions"),
    "Q31": (12, "NSW and Commonwealth Constitutions compared"),
    "Q32": (10, "Australian legal institutions"),
    "Q33": (10, "Australian legal institutions"),
}

# Build title lookup from Part C topic headings (already parsed in topic_notes step below,
# but we pre-compute a static fallback here).
PART_C_TITLES = {
    1: "Introduction to the law and its sources",
    2: "What is meant by \u201claw\u201d? (Jurisprudence)",
    3: "Statutory interpretation",
    4: "Doctrine of precedent",
    5: "Legal research",
    6: "Legal referencing",
    7: "Introduction to legal problem solving (IRAC)",
    8: "First Nations law & Indigenous Australians and the law",
    9: "English legal and constitutional foundations",
    10: "Outline of Australian legal institutions",
    11: "NSW and Commonwealth legal and constitutional history",
    12: "NSW and Commonwealth Constitutions compared",
    13: "Courts and tribunals",
    14: "The legal profession and legal ethics",
}

topics_dict = {}
for pair in all_pairs:
    t = parse_topic(pair["topic_heading"])
    if t is None:
        # Try the extra map
        if pair["qnum"] in EXTRA_TOPIC_MAP:
            num, title = EXTRA_TOPIC_MAP[pair["qnum"]]
            t = {"num": num, "title": title}
        else:
            continue
    key = t["num"]
    if key not in topics_dict:
        topics_dict[key] = {
            "num": t["num"],
            "title": t["title"],
            "questions": []
        }
    topics_dict[key]["questions"].append({
        "qnum": pair["qnum"],
        "question": pair["question"],
        "answer": pair["answer"]
    })

# --- Phase 4: Build topic notes from Part C ---
part_c_start = None
part_d_start = None
for i, (style, text) in enumerate(paragraphs):
    t = text.strip()
    if t.startswith("PART C"):
        part_c_start = i
    if t.startswith("PART D"):
        part_d_start = i

topic_notes = {}
if part_c_start and part_d_start:
    current_topic_num = None
    current_topic_title = None
    current_notes = []
    for i in range(part_c_start, part_d_start):
        style, text = paragraphs[i]
        t = text.strip()
        m = TOPIC_RE.match(t)
        if m and style == "Heading 2":
            if current_topic_num:
                topic_notes[current_topic_num] = {
                    "title": current_topic_title,
                    "notes": current_notes
                }
            current_topic_num = int(m.group(1))
            current_topic_title = m.group(2).strip()
            current_notes = []
            continue
        if current_topic_num and t:
            if style in ("Compact", "Body Text", "First Paragraph"):
                current_notes.append(t)
    if current_topic_num:
        topic_notes[current_topic_num] = {
            "title": current_topic_title,
            "notes": current_notes
        }

print(f"\nExtracted notes for {len(topic_notes)} topics")

# --- Phase 5: Combine into final structure ---
final_topics = []
for num in sorted(topics_dict.keys()):
    td = topics_dict[num]
    notes_data = topic_notes.get(num, {"title": td["title"], "notes": []})
    key_concepts = []
    for note in notes_data["notes"]:
        if len(note) > 220:
            note = note[:217] + "..."
        key_concepts.append(note)
        if len(key_concepts) >= 12:
            break
    final_topics.append({
        "num": num,
        "title": td["title"],
        "key_concepts": key_concepts,
        "questions": td["questions"]
    })

total_qs = sum(len(t["questions"]) for t in final_topics)
print(f"\n=== FINAL ===")
print(f"Topics: {len(final_topics)}")
print(f"Total questions: {total_qs}")

output = {
    "title": "Foundations of Law",
    "subtitle": "Open Book Exam Companion — Interactive Mind Map",
    "topics": final_topics
}

OUT_PATH = "/home/z/my-project/scripts/law_data.json"
with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
print(f"\nSaved to {OUT_PATH}")
