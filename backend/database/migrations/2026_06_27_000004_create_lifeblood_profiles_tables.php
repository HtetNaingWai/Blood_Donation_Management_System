<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 30)->unique()->nullable()->after('email');
            $table->string('role', 30)->default('donor')->after('password');
            $table->string('status', 30)->default('active')->after('role');
        });

        Schema::create('donors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('blood_type', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
            $table->string('contact_address')->nullable();
            $table->string('general_location', 150)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->date('last_donation_date')->nullable();
            $table->date('next_eligible_date')->nullable();
            $table->boolean('is_eligible')->default(true);
            $table->enum('availability_status', ['available', 'unavailable', 'temporarily_ineligible'])->default('available');
            $table->unsignedInteger('total_donations')->default(0);
            $table->unsignedInteger('reward_points')->default(0);
            $table->boolean('email_notifications')->default(true);
            $table->boolean('location_sharing')->default(true);
            $table->timestamp('consented_at')->nullable();
            $table->timestamps();
            $table->unique('user_id');
        });

        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('needed_blood_type', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])->nullable();
            $table->string('township');
            $table->text('request_note')->nullable();
            $table->timestamps();
            $table->unique('user_id');
        });

        Schema::create('hospitals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('hospital_name');
            $table->string('license_number')->unique();
            $table->text('address');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('approval_status', 30)->default('pending');
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hospitals');
        Schema::dropIfExists('patients');
        Schema::dropIfExists('donors');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'role', 'status']);
        });
    }
};
