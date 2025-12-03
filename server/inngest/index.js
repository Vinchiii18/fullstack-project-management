import { Inngest } from "inngest";
import prisma from "../config/prisma.js";
import sendEmail from "../config/nodemailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

// Inngest Function to save user data to a database
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.create({
      data: {
        id: data.id,
        email: data?.email_addresses[0]?.email_address,
        name: data?.first_name + " " + data?.last_name,
        image: data?.image_url,
      },
    });
  }
);

// Inngest Function to delete user from database
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.delete({
      where: {
        id: data.id,
      },
    });
  }
);

// Inngest function to update user data in database
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.update({
      where: {
        id: data.id,
      },
      data: {
        email: data?.email_addresses[0]?.email_address,
        name: data?.first_name + " " + data?.last_name,
        image: data?.image_url,
      },
    });
  }
);

// Inngest Function so save workspade data to a database
const syncWorkspaceCreation = inngest.createFunction(
  { id: "sync-workspace-from-clerk" },
  { event: "clerk/organization.created" },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.created_by,
        image_url: data.image_url,
      },
    });

    // Add creator as ADMIN member
    await prisma.workspaceMember.create({
      data: {
        userId: data.created_by,
        workspaceId: data.id,
        role: "ADMIN",
      },
    });
  }
);

//Inngest Function to update workspace data in database
const syncWorkspaceUpdation = inngest.createFunction(
  { id: "update-workspace-from-clerk" },
  { event: "clerk/organization.updated" },
  async ({ event }) => {
    const { data } = event;
    await prisma,
      workspace.update({
        where: {
          id: data.id,
        },
        data: {
          name: data.name,
          slug: data.slug,
          image_url: data.image_url,
        },
      });
  }
);

// Inngest Functiopn to delete workspace from database
const syncWorkspaceDeletion = inngest.createFunction(
  { id: "delete-workspace-with-clerk" },
  { event: "clerk/organization.deleted" },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.delete({
      where: {
        id: data.id,
      },
    });
  }
);

// Inngest Function to save workspace member data to a database
const syncWorkspaceMemberCreation = inngest.createFunction(
  { id: "sync-workspace-member-from-clerk" },
  { event: "clerk/organizationInvitation.accepted" },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspaceMember.create({
      data: {
        userId: data.user_id,
        workspaceId: data.organization_id,
        role: String(data.role_name).toUpperCase(),
      },
    });
  }
);

// Inngest Function to Send Email on Task Creation
const sendTaskAssignmentEmail = inngest.createFunction(
  { id: "send-task-assignment-email" },
  { event: "app/task.assigned" },
  async ({ event, step }) => {
    const { taskId, origin } = event.data;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignee: true, project: true },
    });

    await sendEmail({
      to: task.assignee.email,
      subject: `New Task Assignement in: ${task.project.name}`,
      body: `<div style="font-family: Arial, sans-serif; font-size:14px; color:#333; line-height:1.5;">
                Hi <strong>${task.assignee.name}</strong>,<br><
                <div style="font-size:16px; font-weight:bold;">
                  📌 ${task.title}
                </div>
                <div>
                  ${task.description}
                </div>
                <
                <div>
                  <strong>Due Date:</strong> ${new Date(
                    task.due_date
                  ).toLocaleDateString()}
                </div>
                <
                <a href="${origin}" style="display:inline-block; padding:10px 16px; background:#007bff; color:#fff; text-decoration:none; border-radius:4px;">
                  View Task
                </a>
                <br><
                Please make sure to review and complete it before the due date.<br><
                Thank you.
              </div>
`,
    });

    if (
      new Date(task.due_date).toLocaleDateString() !== new Date().toDateString()
    ) {
      await step.sleepUntil("wait-for-the-due-date", new Date(task.due_date));

      await step.run("check-if-task-is-completed", async () => {
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          include: { assigne: true, project: true },
        });

        if (!task) return;

        if (task.status !== "DONE") {
          await step.run("send-task-reminder-mail", async () => {
            await sendEmail({
              to: task.assignee.email,
              subject: `Reminder for ${task.project.name}!`,
              body: `<div style="font-family: Arial, sans-serif; font-size:14px; color:#333; line-height:1.5;">
                      Hi <strong>${task.assignee.name}</strong>,<br><br>

                      This is a friendly reminder regarding your task under the project
                      <strong>${task.project.name}</strong>.<br><br>

                      <div style="font-size:16px; font-weight:bold;">
                        📌 ${task.title}
                      </div>

                      <div>
                        ${task.description}
                      </div>
                      <br>

                      <div>
                        <strong>Due Date:</strong> ${new Date(
                          task.due_date
                        ).toLocaleDateString()}
                      </div>
                      <br>

                      <a href="${origin}" style="display:inline-block; padding:10px 16px; background:#007bff; color:#fff; text-decoration:none; border-radius:4px;">
                        View Task
                      </a>
                      <br><br>

                      Please make sure to review and complete it before the due date.<br><br>

                      Thank you.
                    </div>`,
            });
          });
        }
      });
    }
  }
);

// Create an empty array where we'll export future Inngest functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  syncWorkspaceCreation,
  syncWorkspaceUpdation,
  syncWorkspaceDeletion,
  syncWorkspaceMemberCreation,
  sendTaskAssignmentEmail,
];
