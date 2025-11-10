'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../lib/store';

interface Ticket {
  id: string;
  sequential_id: number;
  ticket_type: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_by_user_id: string;
  assigned_to_user_id: string;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: string;
  ticket_id: string;
  body: string;
  is_internal_note: boolean;
  comment_by_user_id: string;
  created_at: string;
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token && params.id) {
      fetchTicketDetails();
    }
  }, [token, params.id]);

  const fetchTicketDetails = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/tickets/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTicket(data.ticket);
        setComments(data.comments || []);
      } else {
        console.error('Failed to fetch ticket details');
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`http://localhost:8080/api/v1/tickets/${params.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          body: newComment,
          is_internal_note: ticket?.ticket_type === 'internal' ? isInternalNote : false,
        }),
      });

      if (response.ok) {
        const newCommentData = await response.json();
        setComments([...comments, newCommentData]);
        setNewComment('');
        setIsInternalNote(false);
      } else {
        console.error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading ticket...</div>;
  }

  if (!ticket) {
    return <div className="text-center py-8">Ticket not found</div>;
  }

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    invalidated: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/tickets')}
            className="text-sm text-indigo-600 hover:text-indigo-900 mb-2"
          >
            ← Back to Tickets
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Ticket #{ticket.sequential_id} - {ticket.title}
          </h1>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[ticket.status] || 'bg-gray-100 text-gray-800'}`}>
          {ticket.status.replace('_', ' ')}
        </span>
      </div>

      {/* Ticket Details */}
      <div className="bg-white shadow rounded-lg p-6">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Type</dt>
            <dd className="mt-1 text-sm text-gray-900 capitalize">{ticket.ticket_type}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Category</dt>
            <dd className="mt-1 text-sm text-gray-900">{ticket.category || 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(ticket.created_at).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(ticket.updated_at).toLocaleString()}
            </dd>
          </div>
          {ticket.description && (
            <div className="col-span-2">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{ticket.description}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Comments Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Comments ({comments.length})
        </h2>

        {/* Comment List */}
        <div className="space-y-4 mb-6">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-sm">No comments yet</p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className={`border rounded-lg p-4 ${comment.is_internal_note ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'}`}
              >
                {comment.is_internal_note && (
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-yellow-200 text-yellow-800 rounded mb-2">
                    Internal Note
                  </span>
                )}
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{comment.body}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(comment.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Add Comment Form */}
        <form onSubmit={handleAddComment} className="border-t pt-4">
          <div className="mb-4">
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              Add Comment
            </label>
            <textarea
              id="comment"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Write your comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={submitting}
            />
          </div>

          {ticket.ticket_type === 'internal' && user?.role === 'admin' && (
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                  disabled={submitting}
                />
                <span className="ml-2 text-sm text-gray-700">
                  Internal Note (not visible to customers)
                </span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Add Comment'}
          </button>
        </form>
      </div>
    </div>
  );
}
