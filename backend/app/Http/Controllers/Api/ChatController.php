<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ChatController extends Controller
{
    public function __construct(
        private readonly ChatService $chatService,
    ) {
    }

    // Return only the conversations owned by the authenticated donor or hospital user.
    public function index(Request $request): JsonResponse
    {
        [$user, $role, $profileId] = $this->resolveChatActor($request);

        if (! $profileId) {
            return response()->json([
                'message' => 'Chat profile not found for this account.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        $query = Conversation::query()
            ->with([
                'donor.user:id,name,email,phone',
                'hospital.user:id,name,email,phone',
            ])
            ->withCount('messages')
            ->with([
                'messages' => fn ($builder) => $builder
                    ->latest()
                    ->limit(1)
                    ->with('user:id,name'),
            ]);

        if ($role === User::ROLE_DONOR) {
            $query->where('donor_id', $profileId);
        }

        if ($role === User::ROLE_HOSPITAL) {
            $query->where('hospital_id', $profileId);
        }

        $conversations = $query
            ->latest('updated_at')
            ->get()
            ->map(fn (Conversation $conversation): array => $this->conversationPayload($conversation, $user))
            ->values()
            ->all();

        return response()->json([
            'conversations' => $conversations,
        ]);
    }

    // Create a new donor-hospital conversation pair or return the existing one to avoid duplicates.
    public function store(Request $request): JsonResponse
    {
        [$user, $role, $profileId] = $this->resolveChatActor($request);

        if (! $profileId) {
            return response()->json([
                'message' => 'Chat profile not found for this account.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        $validated = $request->validate([
            'donor_id' => ['nullable', 'integer', Rule::exists('donors', 'id')],
            'hospital_id' => ['nullable', 'integer', Rule::exists('hospitals', 'id')],
        ]);

        if ($role === User::ROLE_DONOR) {
            $validated['donor_id'] = $profileId;
        } elseif ($role === User::ROLE_HOSPITAL) {
            $validated['hospital_id'] = $profileId;
        } else {
            return response()->json([
                'message' => 'Only donors and hospitals can create conversations.',
            ], JsonResponse::HTTP_FORBIDDEN);
        }

        if (empty($validated['donor_id']) || empty($validated['hospital_id'])) {
            return response()->json([
                'message' => 'A donor and hospital are both required to start a conversation.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        $conversation = $this->chatService->createConversation(
            (int) $validated['donor_id'],
            (int) $validated['hospital_id'],
        );

        $conversation->load([
            'donor.user:id,name,email,phone',
            'hospital.user:id,name,email,phone',
        ]);

        return response()->json([
            'message' => $conversation->wasRecentlyCreated
                ? 'Conversation created successfully.'
                : 'Conversation already exists.',
            'conversation' => $this->conversationPayload($conversation, $user),
        ], $conversation->wasRecentlyCreated ? JsonResponse::HTTP_CREATED : JsonResponse::HTTP_OK);
    }

    // Load the messages inside a specific conversation after confirming the user owns the thread.
    public function messages(Request $request, int $conversationId): JsonResponse
    {
        $conversation = $this->ownedConversation($request->user(), $conversationId);

        if (! $conversation) {
            if (Conversation::query()->whereKey($conversationId)->exists()) {
                return response()->json([
                    'message' => 'Unauthorized.',
                ], JsonResponse::HTTP_FORBIDDEN);
            }

            return response()->json([
                'message' => 'Conversation not found.',
            ], JsonResponse::HTTP_NOT_FOUND);
        }

        $messages = $this->chatService->getConversationMessages($conversation)
            ->map(fn (Message $message): array => $this->messagePayload($message))
            ->values()
            ->all();

        return response()->json([
            'conversation' => $this->conversationPayload($conversation->load([
                'donor.user:id,name,email,phone',
                'hospital.user:id,name,email,phone',
            ]), $request->user()),
            'messages' => $messages,
        ]);
    }

    // Store a new message in the conversation while preserving strict donor/hospital ownership rules.
    public function sendMessage(Request $request, int $conversationId): JsonResponse
    {
        $conversation = $this->ownedConversation($request->user(), $conversationId);

        if (! $conversation) {
            if (Conversation::query()->whereKey($conversationId)->exists()) {
                return response()->json([
                    'message' => 'Unauthorized.',
                ], JsonResponse::HTTP_FORBIDDEN);
            }

            return response()->json([
                'message' => 'Conversation not found.',
            ], JsonResponse::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $message = $this->chatService->sendMessage(
            $conversation,
            $request->user(),
            $validated['message'],
        );

        return response()->json([
            'message' => 'Message sent successfully.',
            'chat_message' => $this->messagePayload($message),
        ], JsonResponse::HTTP_CREATED);
    }

    // Mark unread messages from the other participant as read for the current conversation.
    public function markAsRead(Request $request, int $conversationId): JsonResponse
    {
        $conversation = $this->ownedConversation($request->user(), $conversationId);

        if (! $conversation) {
            if (Conversation::query()->whereKey($conversationId)->exists()) {
                return response()->json([
                    'message' => 'Unauthorized.',
                ], JsonResponse::HTTP_FORBIDDEN);
            }

            return response()->json([
                'message' => 'Conversation not found.',
            ], JsonResponse::HTTP_NOT_FOUND);
        }

        $updated = $this->chatService->markMessagesRead($conversation, $request->user());

        return response()->json([
            'message' => 'Messages marked as read.',
            'updated_count' => $updated,
        ]);
    }

    private function ownedConversation(User $user, int $conversationId): ?Conversation
    {
        [$resolvedUser, $role, $profileId] = $this->resolveChatActor($user);

        if (! $profileId) {
            return null;
        }

        $query = Conversation::query()->where('id', $conversationId);

        if ($role === User::ROLE_DONOR) {
            $query->where('donor_id', $profileId);
        } elseif ($role === User::ROLE_HOSPITAL) {
            $query->where('hospital_id', $profileId);
        } else {
            return null;
        }

        return $query->first();
    }

    private function resolveChatActor(Request|User $requestOrUser): array
    {
        $user = $requestOrUser instanceof Request ? $requestOrUser->user() : $requestOrUser;
        $user->loadMissing(['donor', 'hospital']);
        $role = (string) $user->role;

        return match ($role) {
            User::ROLE_DONOR => [$user, $role, $user->donor?->id],
            User::ROLE_HOSPITAL => [$user, $role, $user->hospital?->id],
            default => [$user, $role, null],
        };
    }

    private function conversationPayload(Conversation $conversation, User $viewer): array
    {
        $lastMessage = $conversation->messages->first();
        $otherParty = $viewer->role === User::ROLE_DONOR
            ? $conversation->hospital?->user
            : $conversation->donor?->user;

        return [
            'id' => $conversation->id,
            'donor_id' => $conversation->donor_id,
            'hospital_id' => $conversation->hospital_id,
            'participant' => [
                'id' => $otherParty?->id,
                'name' => $otherParty?->name,
                'email' => $otherParty?->email,
                'phone' => $otherParty?->phone,
                'role' => $viewer->role === User::ROLE_DONOR ? User::ROLE_HOSPITAL : User::ROLE_DONOR,
            ],
            'messages_count' => $conversation->messages_count ?? $conversation->messages()->count(),
            'last_message' => $lastMessage ? $this->messagePayload($lastMessage) : null,
            'created_at' => $conversation->created_at,
            'updated_at' => $conversation->updated_at,
        ];
    }

    private function messagePayload(Message $message): array
    {
        return [
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'sender_id' => $message->sender_id,
            'sender_role' => $message->sender_role,
            'sender_name' => $message->user?->name,
            'message' => $message->message,
            'read_at' => $message->read_at,
            'created_at' => $message->created_at,
            'updated_at' => $message->updated_at,
        ];
    }
}
