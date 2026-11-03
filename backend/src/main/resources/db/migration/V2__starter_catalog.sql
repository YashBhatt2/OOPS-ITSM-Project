do $$
declare
  starter_service_id constant uuid := 'f03d9d4a-35fb-4fb4-a78d-2d06e15f88c1';
  starter_category_id constant uuid := '0193a445-87ce-4fa6-9a6e-82a1a0e0f641';
  starter_policy_id constant uuid := 'c1bf9914-3f39-4c78-a42a-3bc9c0a6bb8f';
begin
  if not exists (select 1 from it_service where active) then
    insert into it_service (id, name, description, criticality, active)
    values (starter_service_id, 'General IT Support', 'General workplace IT support.', 2, true)
    on conflict (id) do nothing;
  end if;

  if not exists (select 1 from category where active) then
    insert into category (id, name, active)
    values (starter_category_id, 'General', true)
    on conflict (id) do nothing;
  end if;

  if exists (select 1 from it_service where id = starter_service_id)
     and not exists (select 1 from sla_policy where service_id = starter_service_id) then
    insert into sla_policy (id, service_id, revision, created_at)
    values (starter_policy_id, starter_service_id, 1, current_timestamp)
    on conflict (id) do nothing;
  end if;

  if exists (select 1 from sla_policy where id = starter_policy_id) then
    insert into sla_target (policy_id, priority, response_seconds, resolution_seconds)
    values
      (starter_policy_id, 'P1', 300, 1800),
      (starter_policy_id, 'P2', 900, 7200),
      (starter_policy_id, 'P3', 3600, 28800),
      (starter_policy_id, 'P4', 14400, 86400)
    on conflict (policy_id, priority) do nothing;
  end if;
end $$;
