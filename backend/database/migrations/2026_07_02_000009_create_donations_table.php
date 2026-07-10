<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('donations')) {
            return;
        }

        Schema::create('donations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('donor_id')->constrained('donors')->cascadeOnDelete();
            $table->foreignId('hospital_id')->constrained('hospitals')->cascadeOnDelete();
            $table->foreignId('emergency_request_id')->constrained('emergency_requests')->cascadeOnDelete();
            $table->foreignId('request_response_id')->nullable()->constrained('request_responses')->nullOnDelete();
            $table->enum('blood_type', ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']);
            $table->unsignedInteger('units')->default(1);
            $table->timestamp('donated_at')->nullable();
            $table->string('status', 40)->default('completed');
            $table->timestamps();

            $table->unique('request_response_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('donations');
    }
};
