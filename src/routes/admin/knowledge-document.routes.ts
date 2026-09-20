import { KnowledgeDocumentController } from "@/controller/admin/knowledge-document.controller";
import { TYPES } from "@/di/types";
import { UserRole } from "@/enums/user-role.enum";
import { AuthenticateMiddleware } from "@/middleware/authenticate.middleware";
import { AuthorizeMiddleware } from "@/middleware/authorize.middleware";
import { uploadKnowledgeDocument } from "@/middleware/multer/knowledge-document-upload";
import { Router } from "express";
import { inject, injectable } from "inversify";

@injectable()
export class KnowledgeDocumentRoutes {
  public readonly router: Router;

  constructor(
    @inject(TYPES.KnowledgeDocumentController)
    private readonly _knowledgeDocumentController: KnowledgeDocumentController,

    @inject(TYPES.AuthenticateMiddleware)
    private readonly _authenticateMiddleware: AuthenticateMiddleware,

    @inject(TYPES.AuthorizeMiddleware)
    private readonly _authorizeMiddleware: AuthorizeMiddleware,
  ) {
    this.router = Router();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      "/knowledge-documents",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.ADMIN),
      uploadKnowledgeDocument.single("file"),
      this._knowledgeDocumentController.uploadDocument.bind(this._knowledgeDocumentController),
    );

    this.router.get(
      "/knowledge-documents",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.ADMIN),
      this._knowledgeDocumentController.getDocuments.bind(this._knowledgeDocumentController),
    );

    this.router.get(
      "/knowledge-documents/:id",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.ADMIN),
      this._knowledgeDocumentController.getDocumentById.bind(this._knowledgeDocumentController),
    );

    this.router.delete(
      "/knowledge-documents/:id",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.ADMIN),
      this._knowledgeDocumentController.deleteDocument.bind(this._knowledgeDocumentController),
    );
  }
}
