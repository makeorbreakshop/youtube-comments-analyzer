import Link from 'next/link';
import { tokens, componentStyles } from '@/lib/design-system';

export default function DashboardNav() {
  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* App Logo/Name */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="font-bold text-xl text-gray-800">
              Commenter
            </Link>
          </div>
          
          {/* Main Navigation */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="flex space-x-4">
              <Link href="/" className={`${componentStyles.navLink.active}`}>
                Dashboard
              </Link>
              <Link href="/comments" className={`${componentStyles.navLink.default}`}>
                Comments
              </Link>
              <Link href="/settings" className={`${componentStyles.navLink.default}`}>
                Settings
              </Link>
            </div>
          </div>
          
          {/* Right side actions */}
          <div className="ml-4 flex items-center">
            <Link
              href="/admin"
              className={componentStyles.button.secondary}
            >
              Admin Tools
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 