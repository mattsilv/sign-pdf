export async function savePdf(bytes: Uint8Array, filename = "signed.pdf") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = new Blob([bytes as any], { type: "application/pdf" });

  // Chrome/Edge: File System Access API
  if ("showSaveFilePicker" in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: "PDF Files",
            accept: { "application/pdf": [".pdf"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      // User cancelled or API failed - fall through to fallback
      console.log('File System Access API failed:', err);
    }
  }

  // Mobile: Web Share API
  if (navigator.canShare?.({ files: [new File([blob], filename)] })) {
    try {
      await navigator.share({
        files: [new File([blob], filename, { type: "application/pdf" })],
      });
      return;
    } catch (err) {
      console.log('Web Share API failed:', err);
    }
  }

  // Fallback: Download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}