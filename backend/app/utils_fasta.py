from Bio import SeqIO
import csv
import re
from io import StringIO
from collections import Counter

FASTA_EXTS = (".fa", ".fasta", ".fna", ".ffn", ".faa")


def read_fasta_bytes(data: bytes) -> str:
    """Concatenate all sequences from a FASTA byte stream."""
    sio = StringIO(data.decode("utf-8", errors="ignore"))
    seqs = [str(rec.seq) for rec in SeqIO.parse(sio, "fasta")]
    return "".join(seqs)


def read_csv_bytes(data: bytes) -> str:
    """
    CSV parser:
      - If a 'sequence' column exists, concatenate it.
      - Otherwise, treat as generic text and extract only A/C/G/T.
    """
    text = data.decode("utf-8", errors="ignore")
    seqs = []
    try:
        reader = csv.DictReader(StringIO(text))
        if reader.fieldnames and any(fn and fn.lower() == "sequence" for fn in reader.fieldnames):
            for row in reader:
                seqs.append(str(row.get("sequence", "")))
        else:
            # no header or no 'sequence' column → fall back to generic text
            raise ValueError("no-sequence-col")
    except Exception:
        seqs = [text]

    clean = re.sub(r"[^ACGTacgt]", "", "".join(seqs)).upper()
    return clean


def read_pdf_stub(_: bytes) -> str:
    """
    Placeholder for PDFs (no parsing yet). Returning an empty string is fine for
    our simulated model; it’ll still generate a response.
    """
    return ""


def read_any_sequence(filename: str, data: bytes) -> str:
    """
    Dispatch to the right reader based on file extension.
    Falls back to:
      - try FASTA parsing
      - then generic A/C/G/T extraction from text
    """
    fname = (filename or "").lower()
    if fname.endswith(FASTA_EXTS):
        return read_fasta_bytes(data)
    if fname.endswith(".csv"):
        return read_csv_bytes(data)
    if fname.endswith(".pdf"):
        return read_pdf_stub(data)

    # Fallbacks
    seq = read_fasta_bytes(data)
    if seq:
        return seq
    return re.sub(r"[^ACGTacgt]", "", data.decode("utf-8", errors="ignore")).upper()


def kmer_counts(seq: str, k: int = 4):
    """Return k-mer counts in a fixed A/C/G/T^k vocabulary order."""
    seq = re.sub(r"[^ACGT]", "", seq.upper())
    kmers = [seq[i:i + k] for i in range(max(0, len(seq) - k + 1))]
    c = Counter(kmers)

    bases = ["A", "C", "G", "T"]
    vocab = []

    def gen(p, d):
        if d == 0:
            vocab.append(p)
            return
        for b in bases:
            gen(p + b, d - 1)

    gen("", k)
    return [c.get(km, 0) for km in vocab]
