import Link from 'next/link'

const DashboardHeader = () => {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center space-x-4">
        <Link href="/youtube-dashboard">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            YouTube Comments
          </button>
        </Link>
      </div>
    </div>
  )
}

export default DashboardHeader 