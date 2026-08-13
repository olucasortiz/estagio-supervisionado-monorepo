alter table if exists workout_exercises
    add column if not exists muscle text,
    add column if not exists exercise_type text,
    add column if not exists equipment text,
    add column if not exists difficulty text,
    add column if not exists instructions text,
    add column if not exists rest_seconds integer,
    add column if not exists created_at timestamp without time zone default now(),
    add column if not exists order_index integer not null default 0;
