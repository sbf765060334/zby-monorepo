# RcTable fork provenance

`RcTableInner/` was bootstrapped from the upstream TypeScript source of
`@rc-component/table@1.10.4`. It was not copied from the published `es/` or
`lib/` build output.

- Repository: https://github.com/react-component/table
- Tag: `@rc-component/table@1.10.4`
- Commit: `0a343c89daba986c7d526b9ef473cd59b7e56dd3`
- Source directory: upstream `src/`
- License: [RC_TABLE_LICENSE.md](./RC_TABLE_LICENSE.md)

The first fork stage copied all 49 upstream TypeScript and TSX files byte for
byte and verified their SHA-256 hashes before any functional work began. The
subsequent stages intentionally modify the local fork to own zby Table column
resizing, filler sizing, and their shared layout state. The tag and commit above
remain the authoritative baseline for auditing those changes.
