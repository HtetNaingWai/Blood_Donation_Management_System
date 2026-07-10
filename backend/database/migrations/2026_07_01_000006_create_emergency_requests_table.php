<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('emergency_requests')) {
            return;
        }

        Schema::create('emergency_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('hospital_id')->nullable()->constrained('hospitals')->nullOnDelete();
            $table->enum('blood_type', ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']);
            $table->unsignedInteger('units_needed');
            $table->string('status', 40)->default('open');
            $table->string('priority', 40)->default('standard');
            $table->timestamp('required_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('emergency_requests');
    }
};
