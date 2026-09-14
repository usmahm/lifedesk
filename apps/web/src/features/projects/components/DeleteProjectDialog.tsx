"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@lifedesk/ui/components/alert-dialog";

/**
 * Confirms deleting a project, and says what survives.
 *
 * Both `Task.projectId` and `TimeSession.projectId` are `onDelete: SetNull`,
 * so the work and the hours outlive the project — they just stop belonging to
 * it. That is worth stating plainly: "delete" reads as destructive, and
 * someone who expects to lose three weeks of tracked time will never press it.
 */
export function DeleteProjectDialog({
  projectName,
  taskCount,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  projectName: string;
  /** Tasks that will be detached, not deleted. */
  taskCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{projectName}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {taskCount === 0
              ? "This project has no tasks. Tracked time against it is kept."
              : `${taskCount} ${taskCount === 1 ? "task stays" : "tasks stay"} and any time tracked against them is kept — they just stop belonging to a project.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(event) => {
              // Close only once the mutation has been fired, so a slow network
              // can't leave the dialog hanging open on a click that worked.
              event.preventDefault();
              onConfirm();
            }}
          >
            Delete project
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
