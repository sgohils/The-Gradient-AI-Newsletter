"""Extract bounded Actions artifacts without traversal or symlinks."""
import argparse
import stat
import zipfile
from pathlib import Path


def unpack(archive, directory):
    root = directory.resolve()
    with zipfile.ZipFile(archive) as bundle:
        members = bundle.infolist()
        if len(members) > 1000 or sum(item.file_size for item in members) > 100 * 1024 * 1024:
            raise ValueError("Recovery artifact exceeds the extraction budget")
        for member in members:
            target = (root / member.filename).resolve()
            if root not in target.parents and target != root or stat.S_ISLNK(member.external_attr >> 16):
                raise ValueError("Unsafe artifact path")
        bundle.extractall(root)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--directory", type=Path, required=True)
    args = parser.parse_args()
    unpack(args.archive, args.directory)
