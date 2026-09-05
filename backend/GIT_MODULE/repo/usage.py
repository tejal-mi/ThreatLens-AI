# from repo.repository import Repository


# repo = Repository(
#     "https://github.com/dev47929/ThreatLens.git"
# )


# # Repository information
# print(repo.info_repo())



# # Latest 10 commits
# commits = repo.list_commits(
#     branch="main",
#     limit=50,
# )

# for commit in commits:
#     print(commit)


# # # Commit metadata
# # commit = repo.info_commit(
# #     commits[0]["sha"]
# # )

# # print(commit)


# # # Commit diff
# # changes = repo.diff(
# #     commits[0]["sha"]
# # )

# # for change in changes:
# #     print(change["change_type"])
# #     print(change["new_path"])
# #     print(change["diff"])