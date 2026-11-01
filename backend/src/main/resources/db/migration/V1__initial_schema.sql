create table app_user (
  id uuid primary key,
  display_name varchar(255),
  email varchar(255),
  password_hash varchar(255),
  role varchar(255),
  active boolean not null,
  available boolean not null,
  capacity integer not null,
  experience_months integer not null
);

create table skill (
  id uuid primary key,
  name varchar(255),
  active boolean not null
);

create table category (
  id uuid primary key,
  name varchar(255),
  active boolean not null
);

create table it_service (
  id uuid primary key,
  name varchar(255),
  description varchar(10000),
  criticality integer not null,
  active boolean not null
);

create table sla_policy (
  id uuid primary key,
  service_id uuid,
  revision integer not null,
  created_at timestamp with time zone
);

create table incident (
  id uuid primary key,
  reference varchar(255),
  reporter_id uuid,
  service_id uuid,
  category_id uuid,
  title varchar(255),
  description varchar(10000),
  impact integer not null,
  urgency integer not null,
  criticality integer not null,
  affected_user_count integer,
  status varchar(255),
  calculated_priority varchar(255),
  effective_priority varchar(255),
  override_reason varchar(255),
  assignee_id uuid,
  cycle_number integer not null,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  version bigint not null
);

create table service_cycle (
  id uuid primary key,
  incident_id uuid,
  number integer not null,
  policy_id uuid,
  opened_at timestamp with time zone,
  response_due_at timestamp with time zone,
  resolution_due_at timestamp with time zone,
  acknowledged_at timestamp with time zone,
  resolved_at timestamp with time zone,
  verified_at timestamp with time zone,
  verified_by uuid,
  closed_at timestamp with time zone,
  closed_by uuid,
  closure_note varchar(255),
  reopen_reason varchar(255),
  deadline_revision integer not null
);

create table assignment (
  id uuid primary key,
  incident_id uuid,
  cycle_id uuid,
  technician_id uuid,
  assigned_by uuid,
  strategy varchar(255),
  reason varchar(255),
  assigned_at timestamp with time zone,
  ended_at timestamp with time zone
);

create table resolution_attempt (
  id uuid primary key,
  cycle_id uuid,
  technician_id uuid,
  details varchar(10000),
  resolved_at timestamp with time zone,
  outcome varchar(255),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_note varchar(255)
);

create table incident_comment (
  id uuid primary key,
  incident_id uuid,
  author_id uuid,
  body varchar(10000),
  kind varchar(255),
  visibility varchar(255),
  reply_to_id uuid,
  created_at timestamp with time zone
);

create table audit_entry (
  id uuid primary key,
  incident_id uuid,
  cycle_id uuid,
  actor_id uuid,
  action varchar(255),
  previous_value varchar(20000),
  new_value varchar(20000),
  description varchar(10000),
  internal boolean not null,
  created_at timestamp with time zone
);

create table sla_event (
  id uuid primary key,
  cycle_id uuid,
  target varchar(255),
  event_type varchar(255),
  deadline_revision integer not null,
  occurred_at timestamp with time zone,
  detected_at timestamp with time zone
);

create table notification (
  id uuid primary key,
  recipient_id uuid,
  incident_id uuid,
  message varchar(255),
  created_at timestamp with time zone,
  read_at timestamp with time zone,
  email_delivered boolean not null,
  email_attempts integer not null,
  email_delivered_at timestamp with time zone
);

create table feedback (
  id uuid primary key,
  cycle_id uuid,
  reporter_id uuid,
  rating integer not null,
  text varchar(255),
  created_at timestamp with time zone
);

create table incident_relationship (
  id uuid primary key,
  source_id uuid,
  target_id uuid,
  type varchar(255),
  confirmed_by uuid,
  confirmed_at timestamp with time zone
);

create table app_setting (
  id uuid primary key,
  name varchar(255),
  value varchar(255)
);


create table technician_skill (user_id uuid references app_user(id), skill_id uuid references skill(id), level integer not null check(level between 1 and 5), primary key(user_id,skill_id));
create table category_skill (category_id uuid references category(id), skill_id uuid references skill(id), minimum_level integer not null check(minimum_level between 1 and 5), primary key(category_id,skill_id));
create table sla_target (policy_id uuid references sla_policy(id), priority varchar(255), response_seconds bigint not null check(response_seconds>0), resolution_seconds bigint not null check(resolution_seconds>0), primary key(policy_id,priority));
alter table app_user add constraint unique_email unique(email);
alter table app_user add constraint account_role check(role in ('EMPLOYEE','TECHNICIAN','ADMIN'));
alter table app_user add constraint capacity_positive check(capacity>0 and experience_months>=0);
alter table skill add constraint skill_name unique(name);
alter table category add constraint category_name unique(name);
alter table it_service add constraint service_name unique(name);
alter table it_service add constraint criticality_range check(criticality between 1 and 3);
alter table sla_policy add constraint policy_service foreign key(service_id) references it_service(id);
alter table sla_policy add constraint policy_revision unique(service_id,revision);
alter table incident add constraint incident_reference unique(reference);
alter table incident add constraint incident_reporter foreign key(reporter_id) references app_user(id);
alter table incident add constraint incident_service foreign key(service_id) references it_service(id);
alter table incident add constraint incident_category foreign key(category_id) references category(id);
alter table incident add constraint incident_assignee foreign key(assignee_id) references app_user(id);
alter table incident add constraint incident_scales check(impact between 1 and 3 and urgency between 1 and 3 and criticality between 1 and 3);
alter table service_cycle add constraint cycle_incident foreign key(incident_id) references incident(id);
alter table service_cycle add constraint cycle_policy foreign key(policy_id) references sla_policy(id);
alter table service_cycle add constraint cycle_number unique(incident_id,number);
alter table assignment add constraint assignment_cycle foreign key(cycle_id) references service_cycle(id);
alter table assignment add constraint assignment_technician foreign key(technician_id) references app_user(id);
create unique index one_active_assignment on assignment(incident_id) where ended_at is null;
alter table resolution_attempt add constraint resolution_cycle foreign key(cycle_id) references service_cycle(id);
alter table incident_comment add constraint comment_incident foreign key(incident_id) references incident(id);
alter table incident_comment add constraint comment_author foreign key(author_id) references app_user(id);
alter table incident_comment add constraint comment_reply foreign key(reply_to_id) references incident_comment(id);
alter table audit_entry add constraint audit_incident foreign key(incident_id) references incident(id);
alter table audit_entry add constraint audit_cycle foreign key(cycle_id) references service_cycle(id);
alter table sla_event add constraint event_cycle foreign key(cycle_id) references service_cycle(id);
alter table sla_event add constraint unique_sla_event unique(cycle_id,target,event_type,deadline_revision);
alter table notification add constraint notification_recipient foreign key(recipient_id) references app_user(id);
alter table notification add constraint notification_incident foreign key(incident_id) references incident(id);
alter table feedback add constraint feedback_cycle foreign key(cycle_id) references service_cycle(id);
alter table feedback add constraint one_feedback unique(cycle_id);
alter table feedback add constraint feedback_rating check(rating between 1 and 5);
alter table incident_relationship add constraint link_source foreign key(source_id) references incident(id);
alter table incident_relationship add constraint link_target foreign key(target_id) references incident(id);
alter table incident_relationship add constraint no_self_link check(source_id<>target_id);
alter table incident_relationship add constraint unique_link unique(source_id,target_id,type);
alter table app_setting add constraint setting_name unique(name);
create index incident_reporter_date on incident(reporter_id,created_at);
create index incident_status_priority on incident(status,effective_priority);
create index incident_service_date on incident(service_id,created_at);
create index incident_assignee on incident(assignee_id);
create index audit_incident_date on audit_entry(incident_id,created_at);
create index notification_recipient_date on notification(recipient_id,created_at);
create index cycle_deadlines on service_cycle(response_due_at,resolution_due_at);
insert into app_setting(id,name,value) values('00000000-0000-4000-8000-000000000001','assignment_strategy','SKILL_FIRST');

alter table app_user alter column display_name set not null;
alter table app_user alter column email set not null;
alter table app_user alter column password_hash set not null;
alter table app_user alter column role set not null;
alter table skill alter column name set not null;
alter table category alter column name set not null;
alter table it_service alter column name set not null;
alter table sla_policy alter column service_id set not null;
alter table sla_policy alter column created_at set not null;
alter table incident alter column reference set not null;
alter table incident alter column reporter_id set not null;
alter table incident alter column service_id set not null;
alter table incident alter column category_id set not null;
alter table incident alter column title set not null;
alter table incident alter column description set not null;
alter table incident alter column status set not null;
alter table incident alter column calculated_priority set not null;
alter table incident alter column effective_priority set not null;
alter table incident alter column created_at set not null;
alter table incident alter column updated_at set not null;
alter table service_cycle alter column incident_id set not null;
alter table service_cycle alter column policy_id set not null;
alter table service_cycle alter column opened_at set not null;
alter table service_cycle alter column response_due_at set not null;
alter table service_cycle alter column resolution_due_at set not null;
alter table assignment alter column incident_id set not null;
alter table assignment alter column cycle_id set not null;
alter table assignment alter column technician_id set not null;
alter table assignment alter column assigned_by set not null;
alter table assignment alter column strategy set not null;
alter table assignment alter column reason set not null;
alter table assignment alter column assigned_at set not null;
alter table resolution_attempt alter column cycle_id set not null;
alter table resolution_attempt alter column technician_id set not null;
alter table resolution_attempt alter column details set not null;
alter table resolution_attempt alter column resolved_at set not null;
alter table resolution_attempt alter column outcome set not null;
alter table incident_comment alter column incident_id set not null;
alter table incident_comment alter column author_id set not null;
alter table incident_comment alter column body set not null;
alter table incident_comment alter column kind set not null;
alter table incident_comment alter column visibility set not null;
alter table incident_comment alter column created_at set not null;
alter table audit_entry alter column incident_id set not null;
alter table audit_entry alter column cycle_id set not null;
alter table audit_entry alter column action set not null;
alter table audit_entry alter column created_at set not null;
alter table sla_event alter column cycle_id set not null;
alter table sla_event alter column target set not null;
alter table sla_event alter column event_type set not null;
alter table sla_event alter column occurred_at set not null;
alter table sla_event alter column detected_at set not null;
alter table notification alter column recipient_id set not null;
alter table notification alter column incident_id set not null;
alter table notification alter column message set not null;
alter table notification alter column created_at set not null;
alter table feedback alter column cycle_id set not null;
alter table feedback alter column reporter_id set not null;
alter table feedback alter column created_at set not null;
alter table incident_relationship alter column source_id set not null;
alter table incident_relationship alter column target_id set not null;
alter table incident_relationship alter column type set not null;
alter table incident_relationship alter column confirmed_by set not null;
alter table incident_relationship alter column confirmed_at set not null;
alter table app_setting alter column name set not null;
alter table app_setting alter column value set not null;
alter table service_cycle add constraint service_cycle_verified_by_fk foreign key(verified_by) references app_user(id);
alter table service_cycle add constraint service_cycle_closed_by_fk foreign key(closed_by) references app_user(id);
alter table assignment add constraint assignment_incident_id_fk foreign key(incident_id) references incident(id);
alter table assignment add constraint assignment_assigned_by_fk foreign key(assigned_by) references app_user(id);
alter table resolution_attempt add constraint resolution_attempt_technician_id_fk foreign key(technician_id) references app_user(id);
alter table resolution_attempt add constraint resolution_attempt_reviewed_by_fk foreign key(reviewed_by) references app_user(id);
alter table audit_entry add constraint audit_entry_actor_id_fk foreign key(actor_id) references app_user(id);
alter table feedback add constraint feedback_reporter_id_fk foreign key(reporter_id) references app_user(id);
alter table incident_relationship add constraint incident_relationship_confirmed_by_fk foreign key(confirmed_by) references app_user(id);
alter table incident add constraint valid_status check(status in ('NEW','ASSIGNED','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','VERIFIED','CLOSED'));
alter table incident add constraint valid_priority check(calculated_priority in ('P1','P2','P3','P4') and effective_priority in ('P1','P2','P3','P4'));
alter table incident add constraint positive_affected_count check(affected_user_count is null or affected_user_count>0);
alter table service_cycle add constraint positive_cycle check(number>0 and deadline_revision>=0);
alter table incident_comment add constraint valid_visibility check(visibility in ('PUBLIC','INTERNAL'));
alter table incident_comment add constraint valid_comment_kind check(kind in ('NOTE','INFORMATION_REQUEST','REPLY'));
alter table incident_relationship add constraint valid_relationship_type check(type in ('RELATED','DUPLICATE'));
