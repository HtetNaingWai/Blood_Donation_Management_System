<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table): void {
            // Each conversation represents one chat thread between exactly one donor and one hospital.
            $table->id();
            $table->foreignId('donor_id')->constrained('donors')->cascadeOnDelete();
            $table->foreignId('hospital_id')->constrained('hospitals')->cascadeOnDelete();
            $table->timestamps();

            // Prevent duplicate conversation threads for the same donor-hospital pair.
            $table->unique(['donor_id', 'hospital_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
