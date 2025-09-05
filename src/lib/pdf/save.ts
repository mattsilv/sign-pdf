export async function savePdf(bytes: Uint8Array, filename = "signed.pdf") {
  // Ensure filename has .pdf extension
  if (!filename.endsWith('.pdf')) {
    filename = filename + '.pdf';
  }

  console.log('Downloading PDF with filename:', filename);

  // Create blob directly from bytes
  const blob = new Blob([bytes], { type: "application/pdf" });
  
  // Create URL from blob
  const url = URL.createObjectURL(blob);
  
  // Create download link
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  
  // Append to body, click, and remove
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Revoke the URL after a delay to ensure download starts
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}