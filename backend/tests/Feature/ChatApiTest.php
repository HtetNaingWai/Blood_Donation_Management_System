<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\ChatController;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class ChatApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_hospital_can_create_or_reuse_one_conversation_with_a_donor(): void
    {
        [$donorUser, $hospitalUser] = $this->seedChatActors();

        $firstRequest = Request::create('/api/conversations', 'POST', [
            'donor_id' => $donorUser->donor->id,
        ]);
        $firstRequest->setUserResolver(fn (): User => $hospitalUser->fresh()->load('hospital'));

        $first = app(ChatController::class)->store($firstRequest);

        $firstPayload = $first->getData(true);
        $this->assertSame(201, $first->getStatusCode());
        $this->assertSame($donorUser->donor->id, $firstPayload['conversation']['donor_id']);
        $this->assertSame($hospitalUser->hospital->id, $firstPayload['conversation']['hospital_id']);

        $secondRequest = Request::create('/api/conversations', 'POST', [
            'donor_id' => $donorUser->donor->id,
        ]);
        $secondRequest->setUserResolver(fn (): User => $hospitalUser->fresh()->load('hospital'));
        $second = app(ChatController::class)->store($secondRequest);

        $this->assertSame(200, $second->getStatusCode());
        $this->assertDatabaseCount('conversations', 1);
    }

    public function test_chat_message_can_be_sent_and_marked_as_read(): void
    {
        [$donorUser, $hospitalUser] = $this->seedChatActors();

        $conversation = Conversation::create([
            'donor_id' => $donorUser->donor->id,
            'hospital_id' => $hospitalUser->hospital->id,
        ]);

        $sendRequest = Request::create("/api/conversations/{$conversation->id}/messages", 'POST', [
            'message' => 'Hello, we need A+ blood urgently.',
        ]);
        $sendRequest->setUserResolver(fn (): User => $hospitalUser->fresh()->load('hospital'));
        $send = app(ChatController::class)->sendMessage($sendRequest, $conversation->id);

        $sendPayload = $send->getData(true);
        $this->assertSame(201, $send->getStatusCode());
        $this->assertSame('Hello, we need A+ blood urgently.', $sendPayload['chat_message']['message']);

        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversation->id,
            'sender_id' => $hospitalUser->id,
            'message' => 'Hello, we need A+ blood urgently.',
        ]);

        $listRequest = Request::create("/api/conversations/{$conversation->id}/messages", 'GET');
        $listRequest->setUserResolver(fn (): User => $donorUser->fresh()->load('donor'));
        $list = app(ChatController::class)->messages($listRequest, $conversation->id);
        $listPayload = $list->getData(true);
        $this->assertSame(200, $list->getStatusCode());
        $this->assertSame($hospitalUser->id, $listPayload['messages'][0]['sender_id']);

        $readRequest = Request::create("/api/conversations/{$conversation->id}/read", 'PUT');
        $readRequest->setUserResolver(fn (): User => $donorUser->fresh()->load('donor'));
        $read = app(ChatController::class)->markAsRead($readRequest, $conversation->id);
        $readPayload = $read->getData(true);
        $this->assertSame(200, $read->getStatusCode());
        $this->assertSame(1, $readPayload['updated_count']);
    }

    private function seedChatActors(): array
    {
        $donorUser = User::create([
            'name' => 'Donor Chat User',
            'email' => 'donor-chat@example.com',
            'phone' => '09100000001',
            'password' => 'password123',
            'role' => User::ROLE_DONOR,
            'status' => 'active',
        ]);

        $donorUser->donor()->create([
            'blood_type' => 'A+',
            'general_location' => 'Yangon',
            'is_eligible' => true,
            'availability_status' => 'available',
            'email_notifications' => true,
            'location_sharing' => true,
            'consented_at' => now(),
        ]);

        $hospitalUser = User::create([
            'name' => 'Hospital Chat User',
            'email' => 'hospital-chat@example.com',
            'phone' => '09100000002',
            'password' => 'password123',
            'role' => User::ROLE_HOSPITAL,
            'status' => 'active',
        ]);

        $hospitalUser->hospital()->create([
            'hospital_name' => 'Hospital Chat User',
            'license_number' => 'MED-CHAT-1',
            'address' => 'Yangon',
            'approval_status' => 'approved',
        ]);

        return [
            $donorUser->fresh()->load('donor'),
            $hospitalUser->fresh()->load('hospital'),
        ];
    }
}
