# PR 20 — Official ZeniPay logo path

Located on disk at:

    public/zenipay-logo.png        — with background
    public/zenipay-logo-nobg.png   — transparent, for use on dark surfaces

Both files are 1024×1536 PNG, identical size on disk (240,975 bytes). The
no-background variant is what PR 20 consumes: the dashboard runs dark-mode
first (background `--zp-bg-0` = `#0A0B1F`) and the transparent logo sits
cleanly on top.

Code reference:

    import Image from "next/image";
    <Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={110} height={32} />

Both paths are already referenced elsewhere in the repo (see
`app/layout.tsx`, `app/payments/page.tsx`, `app/tools/page.tsx`,
`app/app/ZenivaComplete.tsx`). This PR sticks to the same paths — no
new logo file introduced.

Not to be confused with the Zeniva Travel logo (`public/zeniva-*.png`
white-background travel-agency mark). ZeniPay uses only the wallet-gradient
mark documented above.
