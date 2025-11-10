'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../lib/store';

interface Ticket {
  id: string;
  sequential_id: number;
  ticket_type: string;
  title: string;
  description?: string;
  category?: string;
  status: string;
  created_by_user_id?: string;
  assigned_to_user_id?: string;
  external_customer_ref?: string;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: string;
  body: string;
  is_internal_note: boolean;
  created_at: string;
  comment_by_user_id?: string;
}

export default function TicketsPage() {
  const { token } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20); // Items per page

  useEffect(() => {
    fetchTickets();
  }, [token]);

  const fetchTickets = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch('http://localhost:8080/api/v1/tickets', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      } else {
        console.error('Failed to fetch tickets:', response.status, response.statusText);
        setTickets([]);
        // Show error message to user
        alert(`Failed to load tickets: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request timed out');
        setTickets([]);
        alert('Request timed out. Please check your connection and try again.');
      } else {
        console.error('Failed to fetch tickets:', error);
        setTickets([]);
        // Show error message to user
        alert('Failed to load tickets. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    try {
      const response = await fetch(`http://localhost:8080/api/v1/tickets/${ticket.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      } else {
        console.error('Failed to fetch ticket details:', response.status, response.statusText);
        setComments([]);
      }
    } catch (error) {
      console.error('Failed to fetch ticket details:', error);
      setComments([]);
    }
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedTicket(null);
    setComments([]);
    setNewComment('');
    setIsInternalNote(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newComment.trim()) return;

    try {
      const response = await fetch(`http://localhost:8080/api/v1/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: newComment,
          is_internal_note: isInternalNote,
        }),
      });

      if (response.ok) {
        // Refresh comments
        const ticketResponse = await fetch(`http://localhost:8080/api/v1/tickets/${selectedTicket.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (ticketResponse.ok) {
          const data = await ticketResponse.json();
          setComments(data.comments || []);
        }
        setNewComment('');
        setIsInternalNote(false);
      } else {
        alert('Failed to add comment. Please try again.');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Failed to add comment. Please check your connection and try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'invalidated':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="text-gray-600">Manage support tickets and requests</p>
        </div>
        <div className="text-center py-8">
          <div className="inline-flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading tickets...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
        <p className="text-gray-600">Manage support tickets and requests</p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {tickets.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((ticket) => (
            <li key={ticket.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      T-{ticket.sequential_id}
                    </p>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {ticket.ticket_type}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleViewTicket(ticket)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      View
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-900">{ticket.title}</p>
                  {ticket.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: ticket.description.replace(/</g, '<').replace(/>/g, '>') }}></p>
                  )}
                  {ticket.category && (
                    <p className="text-xs text-gray-500 mt-1">Category: {ticket.category}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Pagination */}
        {tickets.length > pageSize && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(Math.ceil(tickets.length / pageSize), currentPage + 1))}
                disabled={currentPage === Math.ceil(tickets.length / pageSize)}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * pageSize, tickets.length)}</span> of{' '}
                  <span className="font-medium">{tickets.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(Math.ceil(tickets.length / pageSize), currentPage + 1))}
                    disabled={currentPage === Math.ceil(tickets.length / pageSize)}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {showDetail && selectedTicket && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Ticket T-{selectedTicket.sequential_id}: {selectedTicket.title}
              </h3>
              <button
                onClick={handleCloseDetail}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Status:</span>
                  <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                    {selectedTicket.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Type:</span>
                  <span className="ml-2 text-sm text-gray-900">{selectedTicket.ticket_type}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Created:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Updated:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {new Date(selectedTicket.updated_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedTicket.description && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Description:</span>
                  <p className="mt-1 text-sm text-gray-900">{selectedTicket.description}</p>
                </div>
              )}

              {selectedTicket.category && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Category:</span>
                  <span className="ml-2 text-sm text-gray-900">{selectedTicket.category}</span>
                </div>
              )}

              {selectedTicket.external_customer_ref && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Customer Reference:</span>
                  <span className="ml-2 text-sm text-gray-900">{selectedTicket.external_customer_ref}</span>
                </div>
              )}

              {/* Comments Section */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">Comments</h4>
                <div className="space-y-3 mb-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className={`rounded-lg p-3 ${comment.is_internal_note ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                      <p className="text-sm text-gray-900">{comment.body}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </p>
                        {comment.is_internal_note && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            Internal Note
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="space-y-3">
                  <div>
                    <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
                      Add Comment
                    </label>
                    <textarea
                      id="comment"
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Enter your comment..."
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                      />
                      <span className="ml-2 text-sm text-gray-700">Internal note (not visible to customers)</span>
                    </label>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCloseDetail}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Add Comment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}