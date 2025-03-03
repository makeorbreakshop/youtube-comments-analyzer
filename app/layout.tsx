import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import DashboardNav from "@/components/dashboard-nav";

const inter = Inter({ subsets: ["latin"] });

// Add this before the RootLayout component
const autoFixScript = `
  // Auto-fix reply counts for displayed comments
  window.addEventListener('DOMContentLoaded', () => {
    // Add a mutation observer to detect when comments are added to the page
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        // Check for added nodes that might contain comments
        if (mutation.addedNodes.length) {
          // Look for comment elements that have an id attribute
          document.querySelectorAll('[data-comment-id]').forEach(comment => {
            const commentId = comment.getAttribute('data-comment-id');
            if (commentId && !comment.getAttribute('data-count-fixed')) {
              // Mark as fixed to avoid duplicate calls
              comment.setAttribute('data-count-fixed', 'true');
              
              // Call the fix API
              fetch('/api/fix-reply-counts?commentId=' + commentId)
                .then(response => response.json())
                .then(data => {
                  console.log('Fixed reply count for comment:', commentId, data);
                })
                .catch(error => {
                  console.error('Error fixing reply count:', error);
                });
            }
          });
        }
      });
    });
    
    // Observe the entire document for changes
    observer.observe(document.body, { childList: true, subtree: true });
  });
`;

export const metadata: Metadata = {
  title: "Commenter",
  description: "Import and analyze comments from YouTube channels",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Add the auto-fix script */}
        <script dangerouslySetInnerHTML={{ __html: autoFixScript }} />
      </head>
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <DashboardNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
} 