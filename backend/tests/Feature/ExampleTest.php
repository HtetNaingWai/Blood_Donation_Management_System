<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\StatusController;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_the_status_controller_returns_the_expected_payload(): void
    {
        $response = app(StatusController::class)();

        $payload = $response->getData(true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('LifeBlood', $payload['application']);
        $this->assertSame('API online', $payload['status']);
    }
}
